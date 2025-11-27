import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../utils/apiClient'
import MainSidebar from '../components/Sidebar/MainSidebar'
import Pagination from '../components/Pagination'

function ArticleList({ type }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0 })
  const [isDark, setIsDark] = useState(() => {
    return document.body.classList.contains('dark-theme')
  })
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

  // 监听主题变化
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.body.classList.contains('dark-theme'))
    }
    
    // 初始检查
    checkTheme()
    
    // 监听主题变化事件
    const handleThemeChange = () => {
      checkTheme()
    }
    
    document.addEventListener('themeChange', handleThemeChange)
    
    // 使用MutationObserver监听body类变化
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => {
      document.removeEventListener('themeChange', handleThemeChange)
      observer.disconnect()
    }
  }, [])

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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9">
          {/* 列表布局 */}
          <div className="space-y-4">
            {articles.length === 0 && (
              <div className="text-center w-full py-12 text-gray-500 dark:text-gray-400">暂无数据</div>
            )}
            {articles.map(article => (
              <div 
                key={article.id} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 flex-shrink-0">
                    <Link to={`/${type}/${article.id}`} className="block">
                      <div className="w-full h-40 md:h-40 overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img 
                          src={article.图片 || '/static/images/default-placeholder.png'} 
                          alt={article.标题}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                  </div>
                  <div className="md:w-2/3 flex-1 p-4">
                    <h6 className="text-lg font-semibold mb-2">
                      <Link 
                        to={`/${type}/${article.id}`} 
                        className="text-gray-900 dark:text-gray-100 hover:text-green-600 dark:hover:text-green-400 transition-colors no-underline"
                      >
                        {article.标题}
                      </Link>
                    </h6>
                    {article.内容 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                        {stripHtml(article.内容)}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      {article.作者 && (
                        <span className="flex items-center gap-1">
                          <i className="bi bi-person"></i> 
                          <span>{article.作者}</span>
                        </span>
                      )}
                      {article.更新时间 && (
                        <span className="flex items-center gap-1">
                          <i className="bi bi-calendar"></i> 
                          <span>{new Date(article.更新时间).toLocaleDateString('zh-CN')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-8">
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

