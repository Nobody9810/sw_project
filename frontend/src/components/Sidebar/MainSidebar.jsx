import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import apiClient from '../../utils/apiClient'
import { formatDateToChinese } from '../../utils/dateFormatter'
import BookReviewCategorySidebar from './BookReviewCategorySidebar'

const SIDEBAR_SECTIONS = [
  {
    title: '热门文章',
    sources: [
      { label: '通讯', type: '通讯' },
      { label: '译林', type: '译林' },
      { label: '观点', type: '观点' },
      { label: '文艺', type: '文艺' },
      { label: '文史', type: '文史' },
      { label: '书评', type: '书评' },
    ],
  },
  {
    title: '近期文档',
    sources: [
      { label: '古籍', type: '古籍' },
      { label: '论文', type: '论文' },
      { label: '书库', type: '书库' },
    ],
  },
]

// 侧边栏数据缓存 - 5分钟过期
// 使用 sessionStorage 持久化缓存，避免页面刷新后丢失
const sidebarCache = {
  CACHE_KEY: 'sidebar_data_cache',
  TTL: 5 * 60 * 1000, // 5分钟

  get() {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY)
      if (!cached) return null
      
      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()
      
      // 检查是否过期
      if (data && (now - timestamp) < this.TTL) {
        return data
      } else {
        // 过期了，清除缓存
        this.clear()
        return null
      }
    } catch (e) {
      // 解析失败，清除缓存
      this.clear()
      return null
    }
  },

  set(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
    } catch (e) {
      // sessionStorage 可能不可用（隐私模式等），静默失败
      console.warn('无法保存侧边栏缓存:', e)
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(this.CACHE_KEY)
    } catch (e) {
      // 忽略错误
    }
  }
}

function MainSidebar() {
  const [sidebarData, setSidebarData] = useState({})
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  
  // 判断是否在书评相关页面（处理URL编码）
  const decodedPath = decodeURIComponent(location.pathname)
  const isBookReviewPage = decodedPath.startsWith('/书评') || decodedPath.includes('书评') || 
                           location.pathname.includes('%E4%B9%A6%E8%AF%84') || // URL编码的"书评"
                           location.pathname.startsWith('/%E4%B9%A6%E8%AF%84')

  useEffect(() => {
    let mounted = true

    const fetchSidebarData = async () => {
      // 先检查缓存
      const cachedData = sidebarCache.get()
      if (cachedData) {
        if (mounted) {
          setSidebarData(cachedData)
          setLoading(false)
        }
        return
      }

      // 如果没有缓存，先显示空状态（不阻塞页面）
      if (mounted) {
        setLoading(true)
      }

      try {
        // 使用 Promise.allSettled 确保即使部分请求失败也能继续
        // 添加超时控制，避免单个请求阻塞太久
        const createRequest = (source) => {
          return Promise.race([
            apiClient.get(`/${source.type}/`, {
              params: { page_size: 1 },
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('请求超时')), 5000)
            )
          ]).then(response => {
            const items = response.data?.results ?? response.data ?? []
            return { type: source.type, items }
          }).catch(error => {
            console.error(`加载${source.type}侧边数据失败`, error)
            return { type: source.type, items: [] }
          })
        }

        const requests = SIDEBAR_SECTIONS.flatMap(section =>
          section.sources.map(createRequest)
        )

        const results = await Promise.all(requests)
        if (mounted) {
          const dataMap = results.reduce((acc, { type, items }) => {
            acc[type] = items
            return acc
          }, {})

          // 更新缓存
          sidebarCache.set(dataMap)
          
          setSidebarData(dataMap)
          setLoading(false)
        }
      } catch (error) {
        console.error('加载侧边栏失败', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // 延迟加载，让主内容先显示
    const timer = setTimeout(() => {
      fetchSidebarData()
    }, 100)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [])


  return (
    <div>
      {/* 书评分类 - 只在书评页面显示 */}
      {isBookReviewPage && <BookReviewCategorySidebar />}

      {SIDEBAR_SECTIONS.map(section => (
        <div
          key={section.title}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden border border-transparent dark:border-gray-700"
        >
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 relative">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 m-0 pl-2.5 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-3.5 before:bg-green-600 before:rounded-sm">
              {section.title}
            </h4>
          </div>
          <div className="p-2">
            {loading ? (
              // 加载骨架屏
              <div className="space-y-2">
                {section.sources.map((source, idx) => (
                  <div key={`skeleton-${source.type}-${idx}`} className="p-2 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="flex justify-between">
                      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              section.sources.map(source =>
                (sidebarData[source.type] || []).map((item, index, array) => (
                  <div
                    key={`${source.type}-${item.id}`}
                    className={`p-2 ${
                      index !== array.length - 1
                        ? 'border-b border-dashed border-gray-200 dark:border-gray-700'
                        : ''
                    }`}
                  >
                    <Link
                      to={`/${source.type}/${item.id}`}
                      className="block text-inherit no-underline group"
                    >
                      <h5 className="text-xs font-bold text-gray-800 dark:text-gray-200 m-0 mb-1 leading-snug line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {item.标题}
                      </h5>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-green-600 dark:text-green-400 font-medium text-xs">
                          {source.label}
                        </span>
                        {item.更新时间 && (
                          <span className="text-gray-500 dark:text-gray-500 text-xs">
                            {formatDateToChinese(item.更新时间)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MainSidebar


