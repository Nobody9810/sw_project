import { History } from 'lucide-react'
import usePaginatedContent from '@/hooks/usePaginatedContent'
import ContentRegion from '@/components/common/ContentRegion'
import Pagination from '@/components/common/Pagination'
import RichText from '@/components/content/RichText'
import { formatDateToChinese } from '@/lib/dateFormatter'
import { UPDATES_FRAME, UPDATES_CARD } from '@/lib/contentLayout'

export default function UpdatesPage() {
  const state = usePaginatedContent('/releases/', 5)
  return <main className={UPDATES_FRAME}>
    <header className="mb-6"><h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-night-100"><History size={24} className="text-green-700 dark:text-sage-400" aria-hidden="true" />更新说明</h1><p className="mt-3 text-sm text-gray-600 dark:text-night-300">记录书味的新功能与阅读体验改进。</p></header>
    <ContentRegion loading={state.loading} error={state.error} onRetry={state.retry} kind="updates" count={state.placeholderCount}>
      {state.items.length ? <div className="space-y-4">{state.items.map(note => <article key={note.id} id={`release-${note.version}`} className={`${UPDATES_CARD} scroll-mt-6`}>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-night-300"><span className="font-medium text-green-700 dark:text-sage-400">{note.version}</span><time dateTime={note.published_at}>{formatDateToChinese(note.published_at)}</time></div>
        <h2 className="mb-3 break-words text-xl font-semibold text-gray-900 dark:text-night-100">{note.title}</h2>
        <p className="mb-5 break-words text-sm leading-7 text-gray-600 dark:text-night-300">{note.summary}</p>
        <RichText html={note.content} />
      </article>)}</div> : <p className="py-8 text-center text-sm text-gray-500 dark:text-night-300">暂无更新说明</p>}
    </ContentRegion>
    <Pagination page={state.page} totalPages={state.totalPages} onPageChange={state.changePage} loading={state.loading} />
  </main>
}
