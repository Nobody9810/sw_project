import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../utils/apiClient'
import MainSidebar from '../components/Sidebar/MainSidebar'
import Pagination from '../components/Pagination'
import PDFThumbnail from '../components/PDFThumbnail'

function BookList({ type }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0 })
  const [isDark, setIsDark] = useState(() => {
    return document.body.classList.contains('dark-theme')
  })
  const pageSize = 16

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
    const fetchItems = async () => {
      setLoading(true)
      try {
        console.log('Fetching items for type:', type)
        const response = await apiClient.get(`/${type}/`, {
          params: { page, page_size: pageSize },
        })
        console.log('API Response:', response.data)
        const data = response.data || {}
        const list = data.results ?? (Array.isArray(data) ? data : [])
        // 调试：检查古籍和论文的文档字段
        if (type === '古籍' || type === '论文') {
          console.log(`${type}列表数据:`, list.map(item => ({
            id: item.id,
            标题: item.标题,
            文档: item.文档,
            图片: item.图片
          })))
        }
        const countValue = typeof data.count === 'number'
          ? data.count
          : Array.isArray(data)
            ? data.length
            : list.length
        setItems(list)
        setPagination({
          count: countValue,
          page,
          pageSize,
        })
      } catch (error) {
        console.error('Error fetching items:', error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [type, page])

  const totalPages = useMemo(() => {
    if (!pagination.count) {
      return items.length > 0 ? 1 : 0
    }
    return Math.ceil(pagination.count / pageSize)
  }, [pagination.count, items.length])

  // 去除 HTML 标签并提取纯文本
  const stripHtml = (html) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    let text = tmp.textContent || tmp.innerText || ''
    // 替换 HTML 实体（如 &nbsp;）为普通空格
    text = text.replace(/&nbsp;/g, ' ').replace(/&[a-zA-Z]+;/g, ' ')
    // 去除开头和结尾的空白，以及多余空白和换行
    return text.replace(/\s+/g, ' ').trim()
  }

  // 获取简介内容（优先使用概述，其次使用内容）
  const getSummary = (item) => {
    if (item.概述) return stripHtml(item.概述)
    if (item.内容) return stripHtml(item.内容)
    if (item.简介) return stripHtml(item.简介)
    return ''
  }

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
        <div className="py-5 text-center text-muted book-list-loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row g-4">
        <div className="col-lg-9">
          {/* 网格风格的图书列表 */}
          <div className="book-grid-container">
            {items.length === 0 && (
              <div className="text-center w-100 py-5 text-muted book-list-empty">暂无数据</div>
            )}
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
              {items.map(item => (
                <div key={item.id} className="col">
                  <div 
                    className="book-card h-100 book-list-card"
                    style={{
                      border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: isDark ? '#242424' : '#fff',
                      boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.08)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)'
                      e.currentTarget.style.boxShadow = isDark ? '0 8px 20px rgba(0,0,0,0.5)' : '0 8px 20px rgba(0,0,0,0.12)'
                      e.currentTarget.style.borderColor = isDark ? '#444' : '#d0d0d0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.08)'
                      e.currentTarget.style.borderColor = isDark ? '#333' : '#e5e5e5'
                    }}
                  >
                    {/* 封面图 */}
                    <Link to={`/${type}/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{ 
                        position: 'relative', 
                        paddingBottom: '126%', 
                        overflow: 'hidden',
                        borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`,
                        backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5'
                      }}>
                        {/* 古籍和论文优先使用PDF首页作为封面 */}
                        {(type === '古籍' || type === '论文') && item.文档 ? (
                          <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                          }}>
                            <PDFThumbnail 
                              pdfUrl={item.文档} 
                              alt={item.标题}
                              onError={(err) => {
                                console.error(`PDF缩略图加载失败 (${item.标题}):`, err, 'URL:', item.文档)
                              }}
                            />
                          </div>
                        ) : (
                          <img 
                            src={item.图片 || '/static/images/default-placeholder.png'} 
                            alt={item.标题}
                            loading="lazy"
                            style={{ 
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        )}
                      </div>
                    </Link>

                    {/* 卡片信息 */}
                    <div style={{ padding: '14px 12px' }}>
                      {/* 标题 */}
                      <h6 style={{ 
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        lineHeight: '1.4',
                        marginBottom: '8px',
                        height: '2.8em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        <Link 
                          to={`/${type}/${item.id}`} 
                          className="book-list-title-link"
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
                          {item.标题}
                        </Link>
                      </h6>

                      {/* 作者 */}
                      {item.作者 && (
                        <div className="book-list-author" style={{ 
                          fontSize: '0.85rem',
                          color: isDark ? '#888' : '#999',
                          marginBottom: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.作者}
                        </div>
                      )}

                      {/* 评分 */}
                      {item.评分 && (
                        <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                          <span style={{ color: '#f99600', letterSpacing: '1px' }}>
                            {'★'.repeat(Math.round(item.评分 / 2))}{'☆'.repeat(5 - Math.round(item.评分 / 2))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div style={{ marginTop: '30px' }}>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="col-lg-3">
          <MainSidebar />
        </div>
      </div>
    </div>
  )
}

export default BookList


