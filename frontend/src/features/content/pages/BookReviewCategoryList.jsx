import useBookReviewCategories from '@/hooks/useBookReviewCategories'
import BookReviewCategorySidebar from '@/components/content/Sidebar/BookReviewCategorySidebar'
import { LIST_FRAME, ARTICLE_ROW, ARTICLE_IMAGE, ARTICLE_BODY } from '@/lib/contentLayout'
import { articlePath } from '@/lib/articleUrl'
import React from 'react'
import { Link, useParams } from '@/lib/navigation'
import { User, Calendar, Tag } from 'lucide-react'
import { formatDateToChinese } from '@/lib/dateFormatter'
import MainSidebar from '@/components/content/Sidebar/MainSidebar'
import ContentWithSidebar from '@/components/common/ContentWithSidebar'
import Pagination from '@/components/common/Pagination'
import ContentRegion from '@/components/common/ContentRegion'
import usePaginatedContent from '@/hooks/usePaginatedContent'
import CoverImage from '@/components/content/CoverImage'

function BookReviewCategoryList() {
  const categories = useBookReviewCategories()
  const { categoryId } = useParams()
  const { items: articles, data, count, totalPages, page, loading, error, placeholderCount, changePage: handlePageChange, retry } = usePaginatedContent(`/book-reviews/category/${categoryId}/`, 15)
  const category = data?.category

  const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

  return (
    <div className={LIST_FRAME}>
      <ContentWithSidebar mobileCollapsible mobileLabel="分类与推荐" sidebar={<MainSidebar categoriesResource={categories} />}>
          <ContentRegion count={placeholderCount} loading={loading} error={error} onRetry={retry} kind="reviews">
          {/* 分类标题 */}
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-sage-900/30 dark:to-sage-800/30 flex items-center justify-center">
              <Tag className="w-5 h-5 text-green-600 dark:text-sage-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-night-100">
                {category?.名称 || '书评分类'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-night-400 mt-1">
                共 {count} 篇书评
              </p>
            </div>
          </div>

          <div className="mb-4 lg:hidden"><BookReviewCategorySidebar compact resource={categories} /></div>

          {/* 文章列表 */}
          {articles.length === 0 ? (
            <div className="text-center w-full py-16 text-gray-500 dark:text-night-400 text-lg">
              该分类下暂无书评
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <article 
                  key={article.id} 
                  className="group bg-white dark:bg-night-800 rounded-lg shadow-sm border border-gray-200 dark:border-night-700 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 md:h-36"
                >
                  <div className={ARTICLE_ROW}>
                    <div className={`${ARTICLE_IMAGE} overflow-hidden bg-gray-100 dark:bg-night-700`}>
                      <Link href={articlePath("书评", article)} className="absolute inset-0">
                        <CoverImage src={article.图片} alt={article.标题} label="书评" loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          placeholderClassName="absolute inset-0 h-full w-full" />
                      </Link>
                    </div>
                    <div className={`${ARTICLE_BODY} pr-3 md:h-full overflow-hidden`}>
                      <h2 className="text-base font-semibold mb-1.5 line-clamp-2 md:text-lg md:line-clamp-1">
                        <Link 
                          href={articlePath("书评", article)} 
                          className="text-gray-900 dark:text-night-100 hover:text-green-600 dark:hover:text-sage-400 transition-colors no-underline"
                        >
                          {article.标题}
                        </Link>
                      </h2>
                      {article.内容 && (
                        <p 
                          className="text-sm text-gray-600 dark:text-night-400 mb-2 sm:flex-1 overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.4',
                            maxHeight: '2.8em',
                          }}
                        >
                          {stripHtml(article.内容)}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-night-400 sm:mt-0 md:mt-auto sm:pt-1.5 sm:border-t border-gray-200 dark:border-night-700">
                        {article.作者 && (
                          <span className="flex min-w-0 items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" /> 
                            <span className="max-w-24 truncate sm:max-w-none">{article.作者}</span>
                          </span>
                        )}
                        {article.更新时间 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" /> 
                            <span>{formatDateToChinese(article.更新时间)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* 分页 */}
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

export default BookReviewCategoryList

