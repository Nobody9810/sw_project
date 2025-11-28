import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Calendar } from 'lucide-react'
import apiClient from '../utils/apiClient'
import { formatDateToChinese } from '../utils/dateFormatter'
import MainSidebar from '../components/Sidebar/MainSidebar'
import Pagination from '../components/Pagination'
import { useTheme } from '../hooks/useTheme'

function ArticleList({ type }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0 })
  const { isDark } = useTheme()
  const pageSize = 12

  // 去除 HTML 标签并提取纯文本
  const stripHtml = (html) => {
    if (!html) return ''
    // 创建临时 div 元素来解析 HTML
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    // 获取纯文本内容
    let text = tmp.textContent || tmp.innerText || ''
    // 替换 HTML 实体（如 &nbsp;）为普通空格
    text = text.replace(/&nbsp;/g, ' ').replace(/&[a-zA-Z]+;/g, ' ')
    // 去除开头和结尾的空白，以及多余空白和换行
    return text.replace(/\s+/g, ' ').trim()
  }

  useEffect(() => {
    setPage(1)
  }, [type])

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true)
      try {
        // 使用普通列表 API
        console.log('Fetching articles for type:', type, 'URL:', `/${type}/`)
        const response = await apiClient.get(`/${type}/`, {
          params: { page, page_size: pageSize },
        })
        console.log('API Response:', response.data)
        const data = response.data || {}
        const list = data.results ?? (Array.isArray(data) ? data : [])
        console.log('Parsed list:', list, 'Count:', list.length)
        const countValue = typeof data.count === 'number'
          ? data.count
          : Array.isArray(data)
            ? data.length
            : list.length
        setArticles(list)
        setPagination({
          count: countValue,
          page,
          pageSize,
        })
      } catch (error) {
        console.error('Error fetching articles:', error)
        console.error('Error details:', error.response?.data || error.message)
        setArticles([])
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [type, page])

  const totalPages = useMemo(() => {
    if (!pagination.count) {
      return articles.length > 0 ? 1 : 0
    }
    return Math.ceil(pagination.count / pageSize)
  }, [pagination.count, articles.length])


  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 min-h-[calc(100vh-500px)] flex items-center justify-center">
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-9">
          {/* 列表布局 */}
          <div className="space-y-3">
            {articles.length === 0 && (
              <div className="text-center w-full py-16 text-gray-500 dark:text-gray-400 text-lg">
                暂无数据
              </div>
            )}
            {articles.map(article => (
              <article 
                key={article.id} 
                className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 md:h-36"
              >
                <div className="flex flex-col md:flex-row md:h-full">
                  <div className="w-full md:w-1/4 flex-shrink-0 relative overflow-hidden bg-gray-100 dark:bg-gray-700 h-32 md:h-full">
                    <Link to={`/${type}/${article.id}`} className="absolute inset-0">
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
                        to={`/${type}/${article.id}`} 
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

export default ArticleList

