import { ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import ReaderDock from './ReaderDock'
import DirectoryButton from './DirectoryButton'
import styles from './ReaderDock.module.css'

const ghost = 'inline-flex h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full text-sm text-gray-600 transition-colors enabled:hover:bg-green-50 enabled:hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-30 dark:text-night-300 dark:enabled:hover:bg-night-800 dark:enabled:hover:text-sage-300'

// Bottom reading bar for hadith lists: where the reader is, and what to read next.
// `previous` / `next` follow the reading order (next page, then next chapter):
// { label, target, edge, onClick }, target null at the very start / end with `edge` naming it.
// `skip` (desktop) jumps straight to the neighbouring chapters; without it the bar offers 回到顶部.
export default function HadithReaderBar({ title, subtitle, previous, next, skip, onTop, onOpenDirectory }) {
  return <ReaderDock label="圣训阅读栏">
    <div className={styles.hadithLayout}>
      <div className={`${styles.hadithPosition} flex min-w-0 flex-1 items-center gap-2`}>
        <DirectoryButton onOpen={onOpenDirectory} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-5 text-gray-900 dark:text-night-100">{title}</p>
          <p className="truncate text-[13px] leading-5 tabular-nums text-gray-500 dark:text-night-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" disabled={!previous.target} onClick={previous.onClick}
          aria-label={previous.target ? `${previous.label}：${previous.target}` : previous.edge} title={previous.target || previous.edge}
          className={`${ghost} ${styles.previousPage}`}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" /><span className={styles.previousLabel}>{previous.label}</span>
        </button>
        <button type="button" disabled={!next.target} onClick={next.onClick}
          aria-label={next.target ? `${next.label}：${next.target}` : next.edge} title={next.target || next.edge}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-green-600 pl-4 pr-3 text-sm font-medium text-white shadow-md shadow-green-600/25 transition enabled:hover:bg-green-700 enabled:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 disabled:bg-gray-300 disabled:shadow-none motion-reduce:transition-none dark:bg-sage-600 dark:shadow-black/30 dark:enabled:hover:bg-sage-700 dark:disabled:bg-night-700 dark:focus-visible:ring-offset-night-900">
          {next.label}<ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className={`${styles.chapterActions} items-center justify-end gap-1`}>
        {skip ? <>
          <button type="button" disabled={!skip.previous.target} onClick={skip.previous.onClick} title={skip.previous.target || skip.previous.edge}
            aria-label={skip.previous.target ? `跳到上一篇：${skip.previous.target}` : skip.previous.edge} className={`${ghost} px-2`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />上一篇
          </button>
          <span className="h-4 w-px bg-gray-200 dark:bg-night-700" aria-hidden="true" />
          <button type="button" disabled={!skip.next.target} onClick={skip.next.onClick} title={skip.next.target || skip.next.edge}
            aria-label={skip.next.target ? `跳到下一篇：${skip.next.target}` : skip.next.edge} className={`${ghost} px-2`}>
            下一篇<ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </> : <button type="button" onClick={onTop} className={`${ghost} px-3`}><ArrowUp className="h-4 w-4" aria-hidden="true" />回到顶部</button>}
      </div>
    </div>
  </ReaderDock>
}
