import React from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { Tag } from 'lucide-react'
import SidebarCard from './SidebarCard'
import LoadingState from '@/components/common/LoadingState'
import RequestError from '@/components/common/RequestError'
import useBookReviewCategories from '@/hooks/useBookReviewCategories'

function BookReviewCategorySidebar({ resource, compact = false }) {
  const ownResource = useBookReviewCategories(!resource)
  const { categories, loadingCategories, error, retry } = resource || ownResource
  const { pathname } = useLocation()

  if (!loadingCategories && !error && categories.length === 0) {
    return null
  }

  if (compact) return <nav aria-label="书评分类" className="flex min-h-11 items-center gap-2 overflow-x-auto overscroll-x-contain pb-1">
    {loadingCategories ? <span className="text-xs text-gray-500 dark:text-night-400">正在加载分类…</span> : error ? <div role="alert" className="flex items-center gap-2 text-xs text-red-600 dark:text-red-300"><span>分类加载失败</span><button type="button" onClick={retry} className="min-h-11 shrink-0 px-2 underline">重试</button></div> : [{ id: 'all', 名称: '全部' }, ...categories].map(category => {
      const href = category.id === 'all' ? '/书评' : `/书评/分类/${category.id}`
      let current = pathname
      try { current = decodeURIComponent(pathname) } catch { /* Keep the current path. */ }
      const selected = current.replace(/\/$/, '') === href
      return <Link key={category.id} href={href} aria-current={selected ? 'page' : undefined}
        className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500 ${selected ? 'bg-green-700 font-medium text-white dark:bg-sage-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-night-800 dark:text-night-300 dark:hover:bg-night-700'}`}>{category.名称}</Link>
    })}
  </nav>

  return (
    <SidebarCard title="书评分类" icon={Tag}>
        {loadingCategories ? <LoadingState kind="tags" label="正在加载书评分类…" /> : error ? <RequestError message={error} onRetry={retry} /> : <div className="flex flex-wrap gap-1.5">
          {categories.map(category => (
            <Link
              key={category.id}
              href={`/书评/分类/${category.id}`}
              className="inline-block px-2.5 py-1 bg-green-50 dark:bg-sage-900/30 text-green-700 dark:text-sage-400 rounded-lg font-medium text-sm border border-green-200 dark:border-sage-800 hover:bg-green-100 dark:hover:bg-sage-900/50 transition-colors"
            >
              {category.名称}
            </Link>
          ))}
        </div>}
    </SidebarCard>
  )
}

export default BookReviewCategorySidebar

