import { ChevronLeft, ChevronRight, ListMusic, LoaderCircle, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { quranAudioUrl } from '@/features/content/data/quranReading'
import quranChapters from '@/features/content/data/quranChapters'
import QuranReciterSelect from './QuranReciterSelect'
import ReaderDock from './ReaderDock'
import DirectoryButton from './DirectoryButton'
import styles from './ReaderDock.module.css'

// "第二章 黄牛章" -> full label and "黄牛章".
const chapterLabel = id => quranChapters.find(item => item.id === id)?.label || `第 ${id} 章`
const chapterName = id => chapterLabel(id).split(' ').slice(1).join(' ') || chapterLabel(id)

export default function QuranPlayer({ verses, reciters, reciter, onReciterChange, playback, track, chapter, audioData, reciterData, chapters = [], onChapterChange, onOpenDirectory }) {
  const selected = verses.find(verse => verse.verse === playback.verse) || verses[0]
  if (!selected) return null
  const index = verses.indexOf(selected)
  // Only chapters the official catalog lists are offered.
  const position = chapters.findIndex(item => item.id === chapter)
  const previousChapter = onChapterChange && position > 0 ? chapters[position - 1].id : null
  const nextChapter = onChapterChange && position >= 0 && position < chapters.length - 1 ? chapters[position + 1].id : null
  // At the first / last verse the verse buttons continue into the neighbouring chapter (the phone has no room for more).
  const toPrevious = index > 0
    ? { label: '上一节', disabled: !quranAudioUrl(verses[index - 1], reciter, track, chapter), onClick: () => playback.toggle(verses[index - 1]) }
    : { label: previousChapter ? `上一章：${chapterLabel(previousChapter)}` : '上一节', disabled: !previousChapter, onClick: () => onChapterChange(previousChapter) }
  const toNext = index < verses.length - 1
    ? { label: '下一节', disabled: !quranAudioUrl(verses[index + 1], reciter, track, chapter), onClick: () => playback.toggle(verses[index + 1]) }
    : { label: nextChapter ? `下一章：${chapterLabel(nextChapter)}` : '下一节', disabled: !nextChapter, onClick: () => onChapterChange(nextChapter) }
  const chapterButton = 'inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors enabled:hover:bg-green-50 enabled:hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-30 dark:text-night-300 dark:enabled:hover:bg-night-800 dark:enabled:hover:text-sage-300'
  const running = ['playing', 'loading'].includes(playback.status)
  const PlayIcon = playback.status === 'loading' ? LoaderCircle : running ? Pause : Play
  const control = 'inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors enabled:hover:bg-green-50 enabled:hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-30 dark:text-night-300 dark:enabled:hover:bg-night-800 dark:enabled:hover:text-sage-300'
  const previousChapterButton = <button type="button" disabled={!previousChapter} onClick={() => onChapterChange(previousChapter)} className={chapterButton}
    aria-label={previousChapter ? `上一章：${chapterLabel(previousChapter)}` : '已是第一章'} title={previousChapter ? chapterLabel(previousChapter) : '已是第一章'}>
    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
  </button>
  const nextChapterButton = <button type="button" disabled={!nextChapter} onClick={() => onChapterChange(nextChapter)} className={chapterButton}
    aria-label={nextChapter ? `下一章：${chapterLabel(nextChapter)}` : '已是最后一章'} title={nextChapter ? chapterLabel(nextChapter) : '已是最后一章'}>
    <ChevronRight className="h-4 w-4" aria-hidden="true" />
  </button>
  const modeButton = playback.toggleMode && <button type="button" onClick={playback.toggleMode}
    aria-pressed={playback.mode === 'all'} aria-label={playback.mode === 'all' ? '当前全章播放，切换为单节播放' : '当前单节播放，切换为全章播放'}
    title={playback.mode === 'all' ? '从当前节连续播放到章末；点击改为单节' : '仅播放当前节；点击改为连续播放本章'}
    className="inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-green-700 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-sage-400 dark:hover:bg-night-800">
    <ListMusic className="h-4 w-4" aria-hidden="true" /><span className="text-xs leading-4">{playback.mode === 'all' ? '全章' : '单节'}</span>
  </button>
  return <ReaderDock label="诵读播放器">
    {/* Use the reading column width: an open directory can leave a narrow player on a wide screen. */}
    <div className={`${styles.compactChapter} mb-1 items-center gap-1`}>
      <DirectoryButton onOpen={onOpenDirectory} />
      {previousChapterButton}
      <p className="min-w-0 flex-1 text-center leading-5">
        <span className="block truncate text-[15px] font-semibold text-gray-900 dark:text-night-100">{chapterName(chapter)}</span>
        <span className="block truncate text-[13px] tabular-nums text-gray-500 dark:text-night-400">第 {selected.verse} / {verses.length} 节</span>
      </p>
      {nextChapterButton}
      {modeButton}
    </div>
    {/* Phone: one row, the verse and reciter on the left as the list trigger, controls on the right. */}
    <div className={styles.quranLayout}>
      {/* Desktop chapter switcher. */}
      <div className={`${styles.wideChapter} min-w-0 items-center gap-0.5`}>
        <DirectoryButton onOpen={onOpenDirectory} />
        {previousChapterButton}
        <div className="min-w-0 flex-1 px-0.5">
          <p className="truncate text-[15px] font-semibold leading-5 text-gray-900 dark:text-night-100">{chapterName(chapter)}</p>
          <p className="truncate text-[13px] leading-5 tabular-nums text-gray-500 dark:text-night-400">第 {chapter} 章 · 第 {selected.verse} / {verses.length} 节</p>
        </div>
        {nextChapterButton}
        {modeButton}
      </div>
      <div className={`${styles.playbackControls} flex shrink-0 items-center gap-0.5`}>
        <button type="button" aria-label={toPrevious.label} title={toPrevious.label} disabled={toPrevious.disabled} onClick={toPrevious.onClick} className={control}><SkipBack className="h-5 w-5" aria-hidden="true" /></button>
        <button type="button" aria-label={running ? '暂停诵读' : '播放当前节'} disabled={!quranAudioUrl(selected, reciter, track, chapter)} onClick={() => playback.toggle(selected)} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-md shadow-green-600/25 transition enabled:hover:bg-green-700 enabled:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 disabled:opacity-40 disabled:shadow-none motion-reduce:transition-none dark:bg-sage-600 dark:shadow-black/30 dark:enabled:hover:bg-sage-700 dark:focus-visible:ring-offset-night-900"><PlayIcon className={`h-5 w-5 ${running ? '' : 'translate-x-px'} ${playback.status === 'loading' ? 'motion-safe:animate-spin' : ''}`} fill={running ? 'none' : 'currentColor'} aria-hidden="true" /></button>
        <button type="button" aria-label={toNext.label} title={toNext.label} disabled={toNext.disabled} onClick={toNext.onClick} className={control}><SkipForward className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      {reciters.length > 0 && reciter && <div className={`${styles.reciterCell} flex min-w-0 flex-1`}><QuranReciterSelect reciters={reciters} value={reciter.id} chapter={chapter} onChange={onReciterChange} /></div>}
    </div>
    {reciterData?.status === 'loading' && <p className="pt-1 text-center text-xs text-gray-500 dark:text-night-400">正在加载诵读者…</p>}
    {audioData?.status === 'loading' && <p className="pt-1 text-center text-xs text-gray-500 dark:text-night-400">正在加载录音及同步时间轴…</p>}
    {(reciterData?.status === 'error' || audioData?.status === 'error') && <p role="alert" className="pt-1 text-center text-sm text-red-600 dark:text-red-300">{reciterData?.status === 'error' ? reciterData.error : audioData.error}{/* A timeline that does not fit the recording cannot be fixed by retrying. */}{(reciterData?.status === 'error' || audioData.code !== 'audio_timeline_mismatch') && <button type="button" onClick={reciterData?.status === 'error' ? reciterData.retry : audioData.retry} className="ml-2 min-h-11 text-green-700 underline dark:text-sage-400">重试</button>}</p>}
    {audioData?.status === 'ready' && !track?.word_sync && <p className="pt-1 text-center text-xs text-gray-500 dark:text-night-400">此录音未提供完整逐词时间轴，仍可按节播放。</p>}
    {playback.error && <p role="alert" className="pt-1 text-center text-sm text-red-600 dark:text-red-300">{playback.error}</p>}
  </ReaderDock>
}
