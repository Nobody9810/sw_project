import { LIST_HEADING } from '@/lib/contentLayout'

export default function MobileListHeading({ title, count, loading = false, unit = '篇' }) {
  return <header className={LIST_HEADING}>
    <h1 className="min-w-0 break-words text-xl font-bold tracking-wide text-gray-900 dark:text-night-100">{title}</h1>
    {!loading && count != null && <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs tabular-nums text-gray-600 dark:bg-night-800 dark:text-night-300">共 {count} {unit}</span>}
  </header>
}
