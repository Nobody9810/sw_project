import MobileListHeading from '@/components/content/MobileListHeading'
import { LIST_FRAME, BOOK_COLUMNS, BOOK_COVER, BOOK_CARD } from '@/lib/contentLayout'
import { articlePath } from '@/lib/articleUrl'
import React from 'react'
import { Link } from '@/lib/navigation'
import { User } from 'lucide-react'
import MainSidebar from '@/components/content/Sidebar/MainSidebar'
import ContentWithSidebar from '@/components/common/ContentWithSidebar'
import Pagination from '@/components/common/Pagination'
import ContentRegion from '@/components/common/ContentRegion'
import usePaginatedContent from '@/hooks/usePaginatedContent'
import CoverImage from '@/components/content/CoverImage'

function BookList({ type }) {
  const { items: items, count, totalPages, page, loading, error, placeholderCount, changePage: handlePageChange, retry } = usePaginatedContent(`/${type}/`, 16)

  return (
    <div className={LIST_FRAME}>
      <MobileListHeading title={type} unit={type === '论文' ? '篇' : '本'} count={count} loading={loading} />
      <ContentWithSidebar mobileCollapsible mobileLabel={type === '书评' ? '分类与推荐' : '更多内容'} sidebar={<MainSidebar />}>
          <ContentRegion count={placeholderCount} loading={loading} error={error} onRetry={retry} kind="books">
          <div>
            {items.length === 0 && !loading && (
              <div className="text-center w-full py-16 text-gray-500 dark:text-night-400 text-lg">
                暂无数据
              </div>
            )}
            <div className={BOOK_COLUMNS}>
              {items.map(item => (
  <div 
    key={item.id}
    className={`${BOOK_CARD} group shadow-none sm:shadow-sm sm:hover:shadow-md sm:hover:-translate-y-0.5 transition-all duration-300 motion-reduce:transition-none cursor-pointer ${
      item.is_for_sale
        ? 'border-red-200 dark:border-red-900/50 sm:border-2 sm:border-red-400 dark:sm:border-red-500 ring-1 ring-red-200 dark:ring-red-900/50'
        : 'border-gray-200 dark:border-night-700'
    }`}
  >
    <Link href={articlePath(type, item)} className="block relative overflow-hidden bg-gray-100 dark:bg-night-700">
      <div className={BOOK_COVER}>
        <CoverImage src={item.图片} alt={item.标题} kind="book" label={type} loading="lazy"
          className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
          placeholderClassName="h-full w-full" />
        {/* 醒目横幅角标 */}
        {item.is_for_sale && (
          <div className="absolute top-0 left-0 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-br-lg shadow-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            现货出售
          </div>
        )}
      </div>
    </Link>

    <div className="p-3 flex-1 flex flex-col">
      <h6 className="min-h-10 sm:min-h-0 text-sm font-semibold leading-5 mb-1.5 line-clamp-2 sm:leading-tight sm:line-clamp-1">
        <Link 
          href={articlePath(type, item)} 
          className="text-gray-900 dark:text-night-100 hover:text-green-600 dark:hover:text-sage-400 transition-colors no-underline"
        >
          {item.标题}
        </Link>
      </h6>

      {item.作者 && (
        <div className="text-xs text-gray-600 dark:text-night-400 truncate flex items-center gap-1">
          <User className="w-3 h-3 text-gray-400" />
          <span>{item.作者}</span>
        </div>
      )}

      {item.评分 && (
        <div className="text-xs mt-auto pt-1.5 text-amber-500 tracking-wider">
          {'★'.repeat(Math.round(item.评分 / 2))}{'☆'.repeat(5 - Math.round(item.评分 / 2))}
        </div>
      )}
    </div>
  </div>
))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-10">
              <Pagination compactMobile
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange} loading={loading}
              />
            </div>
          )}
          </ContentRegion>
      </ContentWithSidebar>
    </div>
  )
}

export default BookList
