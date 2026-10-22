import useBookReviewCategories from '@/hooks/useBookReviewCategories'
import BookReviewCategorySidebar from '@/components/content/Sidebar/BookReviewCategorySidebar'
import MobileListHeading from '@/components/content/MobileListHeading'
import { LIST_FRAME, ARTICLE_ROW, ARTICLE_IMAGE, ARTICLE_BODY } from '@/lib/contentLayout'
import { articlePath } from '@/lib/articleUrl'
import React from 'react'
import { Link } from '@/lib/navigation'
import { User, Calendar } from 'lucide-react'
import { formatDateToChinese } from '@/lib/dateFormatter'
import MainSidebar from '@/components/content/Sidebar/MainSidebar'
import ContentWithSidebar from '@/components/common/ContentWithSidebar'
import Pagination from '@/components/common/Pagination'
import ContentRegion from '@/components/common/ContentRegion'
import usePaginatedContent from '@/hooks/usePaginatedContent'
import CoverImage from '@/components/content/CoverImage'

function ArticleList({ type }) {
  const categories = useBookReviewCategories(type === '书评')
  const { items: articles, count, totalPages, page, loading, error, placeholderCount, changePage: handlePageChange, retry } = usePaginatedContent(`/${type}/`, 15)

  const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

  return (
    <div className={LIST_FRAME}>
      <MobileListHeading title={type} count={count} loading={loading} />
      {type === '书评' && <div className="mb-4 lg:hidden"><BookReviewCategorySidebar compact resource={categories} /></div>}
      <ContentWithSidebar mobileCollapsible mobileLabel={type === '书评' ? '分类与推荐' : '更多内容'} sidebar={<MainSidebar categoriesResource={type === '书评' ? categories : undefined} />}>
          <ContentRegion count={placeholderCount} loading={loading} error={error} onRetry={retry} kind="list">
          {articles.length === 0 && !loading ? (
            <div className="text-center py-16 text-gray-500">暂无内容</div>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <article key={article.id} className="group bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-sm border-b border-gray-100 dark:border-night-800 sm:border sm:border-gray-200 sm:dark:border-night-700 overflow-hidden hover:shadow-md transition-all md:h-36">
                  <div className={ARTICLE_ROW}>
                    <div className={`${ARTICLE_IMAGE} bg-gray-100`}>
                      <Link href={articlePath(type, article)} className="absolute inset-0">
                        <CoverImage src={article.图片} alt={article.标题} label={type} loading="lazy"
                          className="w-full h-full object-cover" />
                      </Link>
                    </div>
                    <div className={`${ARTICLE_BODY} sm:justify-between`}>
                      <div>
                        <h2 className="text-base font-bold mb-1 line-clamp-2 md:text-lg md:line-clamp-1">
                          <Link href={articlePath(type, article)} className="text-gray-900 dark:text-night-100 hover:text-green-600 transition-colors">
                            {article.标题}
                          </Link>
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-night-400 line-clamp-2">
                          {stripHtml(article.内容)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-night-400 mt-2 md:flex-nowrap md:gap-4 md:text-gray-400 md:dark:text-gray-400">
                        {article.作者 && (
                          <span className="flex min-w-0 items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="max-w-24 truncate md:max-w-none">{article.作者}</span>
                          </span>
                        )}
                        {article.更新时间 && (
                          <span className="flex min-w-0 items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateToChinese(article.更新时间)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10">
              <Pagination compactMobile page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
            </div>
          )}
          </ContentRegion>
      </ContentWithSidebar>
    </div>
  )
}

export default ArticleList
