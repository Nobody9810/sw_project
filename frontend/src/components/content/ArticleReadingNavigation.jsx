import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { articlePath } from '@/lib/articleUrl'

export default function ArticleReadingNavigation({ type, previous, next }) {
  if (!previous && !next) return null

  return <nav aria-label="文章阅读导航" className="mt-6 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-gray-200 pt-3 dark:border-night-700 sm:grid-cols-2">
    {[{ article: previous, label: '上一篇', Icon: ArrowLeft, rel: 'prev' },
      { article: next, label: '下一篇', Icon: ArrowRight, rel: 'next' }].map(({ article, label, Icon, rel }) => article ?
      <Link key={rel} href={articlePath(type, article)} rel={rel} title={article.标题}
        className="group flex min-h-11 min-w-0 items-center gap-2 rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
        <span className="flex shrink-0 items-center gap-1 text-green-700 dark:text-sage-400"><Icon className="h-4 w-4" aria-hidden="true" />{label}</span>
        <span className="truncate text-gray-900 transition-colors group-hover:text-green-700 dark:text-night-100 dark:group-hover:text-sage-400">{article.标题}</span>
      </Link> : <div key={rel} className="flex min-h-11 items-center text-sm text-gray-500 dark:text-night-400">暂无{label}</div>)}
  </nav>
}
