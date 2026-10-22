"""Exercise the configured official source without touching business data."""
import json
import time
from collections import Counter
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from hadith import quran_reader
from hadith.quran_reader import (
    ReaderError, configured, chapter_catalog, chapter_detail, reciter_catalog,
    chapter_audio,
)


class Command(BaseCommand):
    help = '检查官方 OAuth、114章目录、开端章译文与默认录音时间轴；不写数据库'

    def add_arguments(self, parser):
        parser.add_argument('--require-production', action='store_true', help='正式验收：要求Production、114章6236节中文及完整逐词录音')
        parser.add_argument('--output', help='验收摘要JSON路径，不含密钥、令牌或原始接口内容')
        parser.add_argument('--reciter', help='可选官方chapter-reciter ID，用于正式逐章音频验收')
        parser.add_argument('--diagnose', action='store_true', help='只读输出官方目录结构及中文译本元信息；不输出密钥或令牌')

    def diagnose(self):
        failed = False
        for path, field in (('chapters', 'chapters'), ('resources/translations', 'translations')):
            try:
                payload = quran_reader.qf_get(path, {'language': 'en'})
                rows = payload.get(field)
                self.stdout.write(f'{path}：顶层字段={list(payload.keys())}；条数={len(rows) if isinstance(rows, list) else "非列表"}')
                if not isinstance(rows, list):
                    failed = True
                    continue
                if field == 'chapters':
                    sample = [{key: row.get(key) for key in ('id', 'verses_count')}
                              for row in rows[:3] if isinstance(row, dict)]
                    self.stdout.write('章节编号样本：' + json.dumps(sample, ensure_ascii=False))
                else:
                    languages = Counter(str(row.get('language_name', '')) for row in rows if isinstance(row, dict))
                    self.stdout.write('译本语言：' + json.dumps(dict(languages), ensure_ascii=False))
                    for row in rows:
                        if not isinstance(row, dict): continue
                        public = {key: row.get(key) for key in ('id', 'language_name', 'name', 'author_name', 'slug')}
                        value = json.dumps(public, ensure_ascii=False)
                        if not any(token in value.casefold() for token in ('chinese', 'ma jian', 'ma jain', '马坚', 'zh')):
                            continue
                        for secret in (settings.QF_CLIENT_SECRET, settings.QF_CLIENT_ID):
                            if secret: value = value.replace(secret, '[redacted]')
                        self.stdout.write('中文候选：' + value)
            except ReaderError as error:
                failed = True
                self.stdout.write(f'{path}：[{error.code}] {error} {json.dumps(error.details, ensure_ascii=False)}')
        if failed:
            raise CommandError('目录诊断未全部通过；以上输出不包含密钥或令牌')

    def handle(self, *args, **options):
        if options.get('require_production') and settings.QF_ENV != 'production':
            raise CommandError('正式验收要求 QF_ENV=production 及获批的正式凭据；Pre-live仅提供第1、2章')
        if options.get('require_production') and options.get('diagnose'):
            raise CommandError('--diagnose 与 --require-production 请分别运行')
        if not configured():
            raise CommandError('缺少 QF_CLIENT_ID 或 QF_CLIENT_SECRET；未发送请求')
        self.stdout.write(f'环境：{settings.QF_ENV}；凭据仅用于后端，不输出密钥或令牌。')
        if options.get('diagnose'):
            self.diagnose()
            return
        report = {'environment': settings.QF_ENV, 'mode': 'production_acceptance' if options.get('require_production') else 'connection_check',
                  'passed': False, 'checked_chapters': 0, 'checked_verses': 0, 'checked_audio_chapters': 0,
                  'browser_verified': False, 'audio_issues': [], 'content_issues': [],
                  'attempted_chapters': 0, 'retry_events': [], 'word_sync_chapters': 0}
        def save_report():
            if options.get('output'):
                destination = Path(options['output'])
                temporary = destination.with_name(destination.name + '.tmp')
                temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
                temporary.replace(destination)

        def read_resource(label, callback):
            for attempt in range(3):
                try:
                    return callback()
                except ReaderError as error:
                    transient = (error.code in ('upstream_timeout', 'upstream_connection', 'upstream_request_failed')
                                 or (error.code == 'upstream_http_error' and error.details.get('upstream_status') in (429, 500, 502, 503, 504)))
                    if not transient or attempt == 2:
                        raise
                    report['retry_events'].append({'resource': label, 'attempt': attempt + 1, 'code': error.code})
                    self.stdout.write(f'{label}：暂时连接失败，重试 {attempt + 1}/2')
                    save_report()
                    time.sleep(attempt + 1)

        def problem(error, label):
            return {'resource': label, 'code': error.code, 'message': str(error), **error.details}

        def fatal(error):
            return error.code == 'upstream_http_error' and error.details.get('upstream_status') in (401, 403)

        stage = 'chapter_catalog'
        try:
            catalog = read_resource('chapter_catalog', chapter_catalog)
            chapters = catalog['chapters']
            report['available_chapters'] = len(chapters)
            self.stdout.write(f'官方可用章节目录：{len(chapters)}/114章')
            stage = 'chapter'
            chapter = read_resource('chapter:1', lambda: chapter_detail(1))
            report['chinese_available'] = chapter['translation'] is not None
            self.stdout.write(f'开端章：{len(chapter["verses"])}节；中文版本：{chapter["translation"]["name"] if chapter["translation"] else "官方环境暂未提供"}')
            if options.get('require_production') and not report['chinese_available']:
                raise ReaderError('正式验收缺少马坚中文译文，不能视为完成', 'acceptance_translation_missing')
            stage = 'reciters'
            voices = read_resource('reciters', reciter_catalog)
            voice = next((row for row in voices['reciters'] if row['id'] == options.get('reciter')), None) if options.get('reciter') else voices['reciters'][0]
            if not voice:
                raise ReaderError('验收指定的诵读者不在官方目录中', 'acceptance_reciter_invalid')
            report['reciter_id'] = voice['id']
            self.stdout.write(f'可用 Hafs Murattal 诵读者：{len(voices["reciters"])}位；验收：{voice["name"]}（{voice["id"]}）')
            targets = chapters if options.get('require_production') else [{'id': 1}]
            for target in targets:
                number = target['id']
                stage = f'chapter:{number}'
                report['attempted_chapters'] += 1
                try:
                    data = chapter if number == 1 else read_resource(stage, lambda: chapter_detail(number))
                    if options.get('require_production') and data['translation_status'] != 'ready':
                        raise ReaderError(f'第{number}章中文译文不可用', 'acceptance_translation_missing')
                except ReaderError as error:
                    if not options.get('require_production') or fatal(error):
                        raise
                    report['content_issues'].append({'chapter': number, **problem(error, stage)})
                    self.stdout.write(f'第{number}章：正文检查失败 [{error.code}]，已记录，继续')
                    save_report()
                    continue
                report['checked_chapters'] += 1
                report['checked_verses'] += len(data['verses'])
                stage = f'audio:{number}'
                try:
                    audio = read_resource(stage, lambda: chapter_audio(number, voice['id']))
                except ReaderError as error:
                    if not options.get('require_production') or fatal(error):
                        raise
                    report['audio_issues'].append({'chapter': number, **problem(error, stage)})
                    self.stdout.write(f'第{number}章：录音检查失败 [{error.code}]，已记录，继续')
                    save_report()
                    continue
                report['checked_audio_chapters'] += 1
                report['word_sync_chapters'] += int(audio['word_sync'])
                if options.get('require_production') and not audio['word_sync']:
                    report['audio_issues'].append({'chapter': number, 'code': 'acceptance_word_sync_missing',
                                                   'verses': audio.get('timing_issues', [])})
                self.stdout.write(f'第{number}章：{len(data["verses"])}节；完整逐词时间轴：{audio["word_sync"]}')
                save_report()
            self.stdout.write(f'检查汇总：尝试{report["attempted_chapters"]}章；正文通过{report["checked_chapters"]}章'
                              f'{report["checked_verses"]}节；逐节音频可用{report["checked_audio_chapters"]}章，'
                              f'完整逐字高亮{report["word_sync_chapters"]}章；'
                              f'正文问题{len(report["content_issues"])}章，录音问题{len(report["audio_issues"])}章。')
            if report['content_issues']:
                stage = 'acceptance_summary'
                raise ReaderError('全书检查已结束，存在正文或网络问题，详见报告', 'acceptance_incomplete')
            if report['audio_issues']:
                stage = 'audio_summary'
                raise ReaderError(f'检查已汇总：{len(report["audio_issues"])}章缺少完整逐词时间轴或录音请求失败，详情见报告audio_issues',
                                  'acceptance_word_sync_missing')
            if options.get('require_production') and (report['checked_chapters'] != 114 or report['checked_verses'] != 6236):
                raise ReaderError('正式验收未完成114章6236节', 'acceptance_incomplete')
            report['passed'] = True
        except ReaderError as error:
            report['failure'] = {'stage': stage, 'code': error.code, 'message': str(error), **error.details}
            raise CommandError(f'[{error.code}] {error} {json.dumps(error.details, ensure_ascii=False)}') from None
        finally:
            save_report()
        if options.get('require_production'):
            self.stdout.write(self.style.SUCCESS('正式后端结构验收通过：114章6236节中文与114章逐词录音。浏览器字体、播放及其他书页仍需验证。'))
        else:
            self.stdout.write(self.style.SUCCESS('接口结构检查通过；未修改数据库。此为开端章连通检查，不代表全书正式验收。'))
