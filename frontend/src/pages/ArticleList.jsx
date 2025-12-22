import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Calendar } from 'lucide-react'
import apiClient from '../utils/apiClient'
import { formatDateToChinese } from '../utils/dateFormatter'
import MainSidebar from '../components/Sidebar/MainSidebar'
import Pagination from '../components/Pagination'

function ArticleList({ type }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0 })
  const pageSize = 12

  // 🔥 关键优化1: 当栏目类型改变时,重置页码和数据
  useEffect(() => {
    console.log(`Switching to type: ${type}`)
    setPage(1)
    setArticles([])
    setLoading(true) // 立即显示loading状态
  }, [type])

  // 🔥 关键优化2: 获取数据 - 支持请求取消
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchArticles = async () => {
      console.log(`Fetching ${type} - page ${page}`)
      setLoading(true)
      
      try {
        const response = await apiClient.get(`/${type}/`, {
          params: { page, page_size: pageSize },
          signal: controller.signal
        })
        
        if (isMounted) {
          const data = response.data || {}
          const list = data.results ?? (Array.isArray(data) ? data : [])
          
          console.log(`Loaded ${list.length} articles for ${type}`)
          
          setArticles(list)
          setPagination({
            count: data.count || list.length || 0,
            page,
            pageSize,
          })
        }
      } catch (error) {
        // 🔥 关键优化3: 忽略取消错误
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          console.log(`Request cancelled for ${type}`)
          return
        }
        
        if (isMounted) {
          console.error(`Error fetching ${type}:`, error)
          setArticles([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // 🔥 关键优化4: 延迟执行,避免快速切换时的无效请求
    const timer = setTimeout(() => {
      fetchArticles()
    }, 50) // 50ms延迟,快速切换时会被取消

    return () => {
      isMounted = false
      clearTimeout(timer)
      controller.abort()
      console.log(`Cleanup for ${type} - page ${page}`)
    }
  }, [type, page])

  const stripHtml = (html) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  }

  const totalPages = useMemo(() => {
    return pagination.count ? Math.ceil(pagination.count / pageSize) : 0
  }, [pagination.count])

  // 🔥 关键优化5: 骨架屏 - 即使在加载时也显示结构
  if (loading && articles.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-9">
            <div className="space-y-3">
              {/* 骨架屏 - 显示3个占位项 */}
              {[...Array(3)].map((_, index) => (
                <article key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden md:h-36 animate-pulse">
                  <div className="flex flex-col md:flex-row md:h-full">
                    <div className="w-full md:w-1/4 h-32 md:h-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="w-full md:w-3/4 p-3 flex flex-col justify-between">
                      <div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <MainSidebar />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-9">
          {articles.length === 0 && !loading ? (
            <div className="text-center py-16 text-gray-500">暂无内容</div>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <article key={article.id} className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all md:h-36">
                  <div className="flex flex-col md:flex-row md:h-full">
                    <div className="w-full md:w-1/4 flex-shrink-0 relative bg-gray-100 h-32 md:h-full">
                      <Link to={`/${type}/${article.id}`} className="absolute inset-0">
                        <img 
                          src={article.图片 || '/assets/images/default-placeholder.png'} 
                          alt={article.标题}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = '/assets/images/default-placeholder.png'
                          }}
                        />
                      </Link>
                    </div>
                    <div className="w-full md:w-3/4 p-3 flex flex-col justify-between">
                      <div>
                        <h2 className="text-lg font-bold mb-1 line-clamp-1">
                          <Link to={`/${type}/${article.id}`} className="text-gray-900 dark:text-gray-100 hover:text-green-600 transition-colors">
                            {article.标题}
                          </Link>
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {stripHtml(article.内容)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                        {article.作者 && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {article.作者}
                          </span>
                        )}
                        {article.更新时间 && (
                          <span className="flex items-center gap-1">
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
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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

export default ArticleList
