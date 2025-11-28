import React, { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { User, Calendar, Tag } from 'lucide-react'
import apiClient from '../utils/apiClient'
import { formatDateToChinese } from '../utils/dateFormatter'
import MainSidebar from '../components/Sidebar/MainSidebar'
import Pagination from '../components/Pagination'

function BookReviewCategoryList() {
  const { categoryId } = useParams()
  const [articles, setArticles] = useState([])
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0, total_pages: 0 })
  const pageSize = 12

  // 去除 HTML 标签并提取纯文本
  const stripHtml = (html) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    let text = tmp.textContent || tmp.innerText || ''
    text = text.replace(/&nbsp;/g, ' ').replace(/&[a-zA-Z]+;/g, ' ')
    return text.replace(/\s+/g, ' ').trim()
  }

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get(`/book-reviews/category/${categoryId}/`, {
          params: { page, page_size: pageSize },
        })
        
        if (response.data.success) {
          setArticles(response.data.results || [])
          setCategory(response.data.category)
          setPagination({
            count: response.data.count || 0,
            total_pages: response.data.total_pages || 0,
            page: response.data.page || 1,
            page_size: response.data.page_size || pageSize,
          })
        } else {
          setArticles([])
          setCategory(null)
        }
      } catch (error) {
        console.error('Error fetching category reviews:', error)
        setArticles([])
        setCategory(null)
      } finally {
        setLoading(false)
      }
    }
    if (categoryId) {
      fetchArticles()
    }
  }, [categoryId, page])

  const totalPages = useMemo(() => {
    return pagination.total_pages || 0
  }, [pagination.total_pages])

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 min-h-[calc(100vh-500px)] flex items-center justify-center">
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 min-h-[calc(100vh-500px)] flex items-center justify-center">
        <div className="py-12 text-center text-red-500 dark:text-red-400">分类不存在或已删除</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-9">
          {/* 分类标题 */}
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
              <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {category.名称}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                共 {pagination.count} 篇书评
              </p>
            </div>
          </div>

          {/* 文章列表 */}
          {articles.length === 0 ? (
            <div className="text-center w-full py-16 text-gray-500 dark:text-gray-400 text-lg">
              该分类下暂无书评
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <article 
                  key={article.id} 
                  className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 md:h-36"
                >
                  <div className="flex flex-col md:flex-row md:h-full">
                    <div className="w-full md:w-1/4 flex-shrink-0 relative overflow-hidden bg-gray-100 dark:bg-gray-700 h-32 md:h-full">
                      <Link to={`/书评/${article.id}`} className="absolute inset-0">
                        <img 
                          src={article.图片 || '/assets/images/default-placeholder.png'} 
                          alt={article.标题}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                    </div>
                    <div className="w-full md:w-3/4 flex-1 p-3 flex flex-col md:h-full overflow-hidden">
                      <h2 className="text-lg font-semibold mb-1.5 line-clamp-1">
                        <Link 
                          to={`/书评/${article.id}`} 
                          className="text-gray-900 dark:text-gray-100 hover:text-green-600 dark:hover:text-green-400 transition-colors no-underline"
                        >
                          {article.标题}
                        </Link>
                      </h2>
                      {article.内容 && (
                        <p 
                          className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex-1 overflow-hidden"
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
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 md:mt-auto pt-1.5 border-t border-gray-200 dark:border-gray-700">
                        {article.作者 && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" /> 
                            <span>{article.作者}</span>
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
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <MainSidebar />
        </div>
      </div>
    </div>
  )
}

export default BookReviewCategoryList

