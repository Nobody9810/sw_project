import { useEffect, useRef } from 'react'
import { quranAudioUrl } from '@/features/content/data/quranReading'
import QuranPlayer from './QuranPlayer'
import QuranVerse from './QuranVerse'
import { QURAN_FRAME, QURAN_GUTTER } from '@/lib/contentLayout'
import styles from './QuranReader.module.css'

// Rounded segmented switch for the reading options (script, Chinese translation).
function ReadingSwitch({ label, options, value, onChange }) {
  return <div role="group" aria-label={label} className="inline-flex max-w-full rounded-full bg-gray-100 p-0.5 dark:bg-night-700">
    {options.map(option => <button key={option.id} type="button" aria-pressed={option.id === value} title={option.title || option.label}
      disabled={option.disabled} onClick={() => option.id !== value && onChange(option.id)}
      className={`h-10 min-w-0 truncate rounded-full px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-40 ${option.id === value
        ? 'bg-white font-medium text-green-700 shadow-sm dark:bg-night-800 dark:text-sage-300'
        : 'text-gray-600 hover:text-gray-900 dark:text-night-300 dark:hover:text-night-100'}`}>{option.label}</button>)}
  </div>
}

export default function QuranReader({ arab, reciters, reciter, onReciterChange, playback, readerAudio, fontStatus, reciterData, chapters, onChapterChange, onOpenDirectory, readingOptions, onScriptChange, onTranslationChange }) {
  const scrollRef = useRef(null)
  useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll || !playback.verse) return
    const row = scroll.querySelector(`[data-verse="${playback.verse}"]`)
    const target = row
    if (!target) return
    const item = target.getBoundingClientRect()
    if (item.top < 96 || item.top > window.innerHeight - 160) {
      target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    }
  }, [playback.verse])
  const verses = arab.verses
  const running = ['playing', 'loading'].includes(playback.status)
  return <div>
  <section translate="no" aria-label="古兰经章节阅读" className={`${styles.card} ${QURAN_FRAME}`}>
    <header className={`shrink-0 border-b border-gray-100 py-4 text-center dark:border-night-700 ${QURAN_GUTTER}`}>
      {arab.chapter_name_ar && <p lang="ar" dir="rtl" translate="no" className={`${styles.arabic} text-3xl leading-relaxed text-green-700 dark:text-sage-400`}>{arab.chapter_name_ar}</p>}
      <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-night-100">{arab.chapter_name || `第 ${arab.chapter} 章`}</h2>
      <p className="mt-2 text-xs tabular-nums text-gray-500 dark:text-night-400">第 {arab.chapter} 章 · 共 {arab.verses.length} 节</p>
      {readingOptions && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <ReadingSwitch label="经文字体" value={arab.text_script} onChange={onScriptChange}
          options={readingOptions.scripts.map(item => item.id === arab.script_fallback ? { ...item, disabled: true, title: `本章官方${item.label}数据不一致，暂不可用` } : item)} />
        {readingOptions.translations.length > 1 && <ReadingSwitch label="中文译本"
          options={readingOptions.translations.map(item => ({ ...item, title: item.name }))} value={arab.translation?.id} onChange={onTranslationChange} />}
      </div>}
    </header>

    {arab.script_fallback && <p role="status" className={`pt-3 text-xs leading-6 text-amber-800 dark:text-amber-300 ${QURAN_GUTTER}`}>
      本章官方{readingOptions?.scripts.find(item => item.id === arab.script_fallback)?.label || '所选字体'}数据的逐词与全文不一致，为避免显示错误经文，本章暂以纳斯赫体显示；其他章节仍按您的选择。
    </p>}
    {arab.translation_status === 'unavailable' && <p role="status" className={`pt-3 text-xs leading-6 text-gray-500 dark:text-night-400 ${QURAN_GUTTER}`}>{arab.translation_notice || '当前官方数据源未提供中文译文，暂显示阿拉伯原文。'}</p>}
    {fontStatus?.status === 'error' && <p role="status" className={`pt-3 text-xs text-amber-800 dark:text-amber-300 ${QURAN_GUTTER}`}>经文字体未能加载，当前显示备用字体，字形可能不同。<button type="button" onClick={fontStatus.retry} className="ml-2 min-h-11 text-green-700 underline dark:text-sage-400">重新加载字体</button></p>}
    <div ref={scrollRef} role="region" aria-label="经文阅读区" className={`${styles.scroll} [scroll-margin-top:6rem]`}><ol className={`divide-y divide-gray-100 dark:divide-night-700 ${QURAN_GUTTER}`}>
      {verses.map(verse => {
        const active = playback.verse === verse.verse && running
        return <QuranVerse key={verse.verse} verse={verse} active={active}
          wordPosition={active ? playback.word : null} loading={active && playback.status === 'loading'}
          enabled={Boolean(quranAudioUrl(verse, reciter, readerAudio?.data, arab.chapter))} onToggle={playback.toggle} script={arab.text_script} />
      })}
    </ol></div>
  </section>
  <QuranPlayer verses={verses} reciters={reciters} reciter={reciter} onReciterChange={onReciterChange} playback={playback} track={readerAudio?.data} chapter={arab.chapter} audioData={readerAudio} reciterData={reciterData} chapters={chapters} onChapterChange={onChapterChange} onOpenDirectory={onOpenDirectory} />
  </div>
}
