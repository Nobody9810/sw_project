"""Read-only structural audit of the unified official Quran source."""
import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from hadith.quran_audio import audio_duration_ms
from hadith.quran_reader import (
    UNRELIABLE_RECORDINGS, ReaderError, chapter_detail, chapter_audio, chapter_catalog, configured, qf_get, reciter_catalog,
)


class Command(BaseCommand):
    help = '只读核验官方古兰经中阿文、逐词结构及可选音频时间轴，不写数据库'

    def add_arguments(self, parser):
        parser.add_argument('--chapter', type=int, action='append', help='可多次指定；默认官方可用章节')
        parser.add_argument('--reciter', help='可选：官方 chapter-reciter ID，同时检查录音时间轴')
        parser.add_argument('--durations', action='store_true',
                            help='筛查录音实际时长与官方时间轴末尾的差异；结果只是候选，须用音频核验后才能判定错配')
        parser.add_argument('--output', help='可选JSON报告路径')

    def handle(self, *args, **options):
        if not configured():
            raise CommandError('请先配置完整后端 OAuth 凭据；尚未进行全文核验')
        if options.get('durations'):
            return self.durations(options)
        try:
            chapters = options['chapter'] or [row['id'] for row in chapter_catalog()['chapters']]
        except ReaderError as error:
            raise CommandError(f'[{error.code}] {error}') from None
        if any(not 1 <= number <= 114 for number in chapters):
            raise CommandError('章节必须在1至114之间')
        report = {'chapters': 0, 'verses': 0, 'words': 0, 'audio_checked': 0,
                  'audio_word_sync_chapters': 0, 'audio_issues': [], 'errors': [], 'scope': 'official_available_chapters'}
        for chapter in sorted(set(chapters)):
            try:
                data = chapter_detail(chapter)
                report['chapters'] += 1
                report['verses'] += len(data['verses'])
                report['words'] += sum(len(row['words']) for row in data['verses'])
                if options.get('reciter'):
                    audio = chapter_audio(chapter, options['reciter'])
                    report['audio_checked'] += 1
                    report['audio_word_sync_chapters'] += int(audio['word_sync'])
                    if not audio['word_sync']:
                        report['audio_issues'].append({'chapter': chapter, 'verses': audio.get('timing_issues', [])})
                    self.stdout.write(f'第{chapter}章录音：逐节区间可用；完整逐字高亮：{audio["word_sync"]}')
                self.stdout.write(f'第{chapter}章结构校验通过')
            except ReaderError as error:
                report['errors'].append({'chapter': chapter, 'error': str(error), 'code': error.code, **error.details})
                self.stdout.write(f'第{chapter}章：[{error.code}] {error} {json.dumps(error.details, ensure_ascii=False)}')
        if options.get('output'):
            Path(options['output']).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        self.stdout.write(f'已检查{report["chapters"]}章、{report["verses"]}节，失败{len(report["errors"])}章。未修改任何经文或数据库。此为可用数据的结构核验，不代表完整114章均已取得，也不等同人工逐字校对。')
        if report['errors']:
            raise CommandError('尚有未完成章节，请核对配置与官方接口响应')

    def durations(self, options):
        """Large gaps flag recordings worth checking against the audio; trailing repetitions also cause them."""
        try:
            reciters = [options['reciter']] if options.get('reciter') else [row['id'] for row in reciter_catalog()['reciters']]
            chapters = options['chapter'] or [row['id'] for row in chapter_catalog()['chapters']]
        except ReaderError as error:
            raise CommandError(f'[{error.code}] {error}') from None
        report = {'scope': 'audio_duration_screen', 'checked': 0, 'unknown_duration': [], 'candidates': [], 'errors': []}
        for reciter in reciters:
            for chapter in sorted(set(chapters)):
                try:
                    data = qf_get(f'chapter_recitations/{reciter}/{chapter}', {'segments': 'true'}).get('audio_file') or {}
                    timeline = data['timestamps'][-1]['timestamp_to']
                    duration = audio_duration_ms(data['audio_url'])
                except ReaderError as error:
                    report['errors'].append({'reciter': reciter, 'chapter': chapter, 'code': error.code})
                    continue
                except (KeyError, IndexError, TypeError):
                    report['errors'].append({'reciter': reciter, 'chapter': chapter, 'code': 'audio_format_invalid'})
                    continue
                report['checked'] += 1
                if duration is None:
                    report['unknown_duration'].append({'reciter': reciter, 'chapter': chapter})
                elif abs(duration - timeline) > max(5000, duration * 0.01):
                    row = {'reciter': reciter, 'chapter': chapter, 'audio_ms': round(duration), 'timeline_ms': round(timeline),
                           'blocked': (reciter, chapter) in UNRELIABLE_RECORDINGS}
                    report['candidates'].append(row)
                    self.stdout.write(json.dumps(row, ensure_ascii=False))
        if options.get('output'):
            Path(options['output']).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        self.stdout.write(f'已筛查{report["checked"]}份录音：时长差异候选{len(report["candidates"])}份，'
                          f'无法判定时长{len(report["unknown_duration"])}份，读取失败{len(report["errors"])}份。'
                          '候选须解码音频比对停顿后才能判定，不得据此自动禁用录音。')
