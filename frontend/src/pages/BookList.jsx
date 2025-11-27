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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 min-h-[calc(100vh-500px)] flex items-center justify-center">
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9">
          {/* 网格风格的图书列表 */}
          <div>
            {items.length === 0 && (
              <div className="text-center w-full py-12 text-gray-500 dark:text-gray-400">暂无数据</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.map(item => (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 cursor-pointer h-full flex flex-col"
                >
                  {/* 封面图 */}
                  <Link to={`/${type}/${item.id}`} className="block">
                    <div className="relative h-72 overflow-hidden border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                      {/* 古籍和论文优先使用PDF首页作为封面 */}
                      {(type === '古籍' || type === '论文') && item.文档 ? (
                        <div className="absolute inset-0 w-full h-full">
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
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </Link>

                  {/* 卡片信息 */}
                  <div className="p-3.5 flex-1 flex flex-col">
                    {/* 标题 */}
                    <h6 className="text-sm font-medium leading-snug mb-2 h-14 line-clamp-2">
                      <Link 
                        to={`/${type}/${item.id}`} 
                        className="text-gray-900 dark:text-gray-100 hover:text-green-600 dark:hover:text-green-400 transition-colors no-underline"
                      >
                        {item.标题}
                      </Link>
                    </h6>

                    {/* 作者 */}
                    {item.作者 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 truncate">
                        {item.作者}
                      </div>
                    )}

                    {/* 评分 */}
                    {item.评分 && (
                      <div className="text-xs mt-1.5 text-amber-500 tracking-wider">
                        {'★'.repeat(Math.round(item.评分 / 2))}{'☆'.repeat(5 - Math.round(item.评分 / 2))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 分页 */}
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

        {/* 侧边栏 */}
        <div className="lg:col-span-3">
          <MainSidebar />
        </div>
      </div>
    </div>
  )
}

export default BookList


