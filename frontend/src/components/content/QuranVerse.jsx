import { Fragment, memo } from 'react'
import { Play, Pause, LoaderCircle } from 'lucide-react'
import { QURAN_ROW } from '@/lib/contentLayout'
import styles from './QuranReader.module.css'

function QuranVerse({ verse, active, wordPosition, loading, enabled, onToggle, script = 'qpc-hafs' }) {
  const Icon = active ? loading ? LoaderCircle : Pause : Play
  return <li data-verse={verse.verse} className="scroll-mt-24">
    <button type="button" disabled={!enabled} onClick={() => onToggle(verse)}
      aria-pressed={active} title={`${active ? '暂停' : '播放'}第 ${verse.verse} 节诵读`}
      className={`${QURAN_ROW} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500 ${active ? 'bg-green-50 dark:bg-sage-950' : 'enabled:hover:bg-gray-50 dark:enabled:hover:bg-night-900'}`}>
      <span className="row-span-2 flex flex-col items-center gap-3 pt-2">
        <span className="text-xs tabular-nums text-gray-500 dark:text-night-400">{verse.verse}</span>
        <span className="sr-only">{active ? '暂停诵读' : '播放诵读'}</span>
        <Icon className={`h-4 w-4 text-green-700 dark:text-sage-400 ${active && loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
      </span>
      <span lang="ar" dir="rtl" translate="no" className={`${script === 'indopak' ? `${styles.indopak} leading-[2.6] sm:leading-[2.6]` : `${styles.arabic} leading-[2.3] sm:leading-[2.3]`} min-w-0 text-right text-[30px] text-gray-900 dark:text-night-100 sm:text-[34px]`}>
        {verse.words ? verse.words.map((word, index) => <Fragment key={word.position}><span data-word={word.position}
          className={active && wordPosition === word.position ? 'rounded bg-green-200 text-green-900 dark:bg-sage-600 dark:text-white' : ''}>{word.text}</span>{index < verse.words.length - 1 ? ' ' : null}</Fragment>) : verse.text}
      </span>
      {verse.translation && <span lang="zh-CN" dir="ltr" className="mt-3 min-w-0 break-words text-left text-base leading-8 text-gray-600 dark:text-night-300">{verse.translation}</span>}
    </button>
  </li>
}

export default memo(QuranVerse)
