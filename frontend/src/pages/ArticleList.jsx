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
        <div className="container mt-4" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="py-5 text-center text-muted article-list-loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row g-4">
        <div className="col-lg-9">
          {/* 列表布局 */}
          <div className="article-list-container">
            {articles.length === 0 && (
              <div className="text-center w-100 py-5 text-muted article-list-empty">暂无数据</div>
            )}
            {articles.map(article => (
              <div 
                key={article.id} 
                className="article-list-item mb-3"
                style={{
                  backgroundColor: isDark ? '#242424' : '#fff',
                  borderRadius: '12px',
                  boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  border: `1px solid ${isDark ? '#333' : '#f0f0f0'}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = isDark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div className="row g-0">
                  <div className="col-md-3">
                    <Link to={`/${type}/${article.id}`}>
                      <img 
                        src={article.图片 || '/static/images/default-placeholder.png'} 
                        alt={article.标题}
                        loading="lazy"
                        className="article-list-image"
                        style={{ 
                          width: '100%', 
                          height: '140px', 
                          objectFit: 'cover'
                        }}
                      />
                    </Link>
                  </div>
                  <div className="col-md-9">
                    <div className="article-list-content p-3">
                      <h6 className="article-list-title mb-2" style={{ 
                        fontSize: '1.1rem',
                        fontWeight: '600'
                      }}>
                        <Link 
                          to={`/${type}/${article.id}`} 
                          className="article-list-title-link"
                          style={{ 
                            textDecoration: 'none', 
                            color: isDark ? '#e0e0e0' : '#333',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.color = '#1e88e5'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = isDark ? '#e0e0e0' : '#333'
                          }}
                        >
                          {article.标题}
                        </Link>
                      </h6>
                      {article.内容 && (
                        <p className="article-list-summary text-muted mb-2" style={{
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          color: isDark ? '#bbb' : undefined
                        }}>
                          {stripHtml(article.内容)}
                        </p>
                      )}
                      <div className="article-list-meta" style={{ 
                        fontSize: '0.85rem', 
                        color: isDark ? '#888' : '#999',
                        marginTop: '8px'
                      }}>
                        {article.作者 && (
                          <span className="me-3">
                            <i className="bi bi-person"></i> {article.作者}
                          </span>
                        )}
                        {article.更新时间 && (
                          <span>
                            <i className="bi bi-calendar"></i> {new Date(article.更新时间).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
        <div className="col-lg-3">
          <MainSidebar />
        </div>
      </div>
    </div>
  )
}

export default ArticleList

