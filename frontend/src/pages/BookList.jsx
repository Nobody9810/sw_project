import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import apiClient from '../utils/apiClient'
import MainSidebar from '../components/Sidebar/MainSidebar'
import Pagination from '../components/Pagination'
import { useTheme } from '../hooks/useTheme'

function BookList({ type }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0 })
  const { isDark } = useTheme()
  const pageSize = 16

  // 🔥 关键优化1: 类型改变时重置
  useEffect(() => {
    console.log(`BookList switching to: ${type}`)
    setPage(1)
    setItems([])
    setLoading(true)
  }, [type])

  // 🔥 关键优化2: 支持请求取消
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchItems = async () => {
      console.log(`Fetching ${type} books - page ${page}`)
      setLoading(true)
      
      try {
        const response = await apiClient.get(`/${type}/`, {
          params: { page, page_size: pageSize },
          signal: controller.signal
        })
        
        if (isMounted) {
          const data = response.data || {}
          const list = data.results ?? (Array.isArray(data) ? data : [])
          const countValue = typeof data.count === 'number'
            ? data.count
            : Array.isArray(data)
              ? data.length
              : list.length
          
          console.log(`Loaded ${list.length} books for ${type}`)
          
          setItems(list)
          setPagination({
            count: countValue,
            page,
            pageSize,
          })
        }
      } catch (error) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          console.log(`Request cancelled for ${type}`)
          return
        }
        
        if (isMounted) {
          console.error(`Error fetching ${type}:`, error)
          setItems([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // 延迟执行,避免快速切换
    const timer = setTimeout(() => {
      fetchItems()
    }, 50)

    return () => {
      isMounted = false
      clearTimeout(timer)
      controller.abort()
      console.log(`Cleanup for ${type} books - page ${page}`)
    }
  }, [type, page])

  const totalPages = useMemo(() => {
    if (!pagination.count) {
      return items.length > 0 ? 1 : 0
    }
    return Math.ceil(pagination.count / pageSize)
  }, [pagination.count, items.length])

  // 🔥 关键优化3: 骨架屏
  if (loading && items.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-9">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, index) => (
                <div 
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse"
                >
                  <div className="h-56 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
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
          <div>
            {items.length === 0 && !loading && (
              <div className="text-center w-full py-16 text-gray-500 dark:text-gray-400 text-lg">
                暂无数据
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.map(item => (
                <div 
                  key={item.id}
                  className="group bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full flex flex-col"
                >
                  <Link to={`/${type}/${item.id}`} className="block relative overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <div className="relative h-56 overflow-hidden border-b border-gray-200 dark:border-gray-700">
                      <img 
                        src={item.图片 || '/assets/images/default-placeholder.png'} 
                        alt={item.标题}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = '/assets/images/default-placeholder.png'
                        }}
                      />
                    </div>
                  </Link>

                  <div className="p-3 flex-1 flex flex-col">
                    <h6 className="text-sm font-semibold leading-tight mb-1.5 line-clamp-1">
                      <Link 
                        to={`/${type}/${item.id}`} 
                        className="text-gray-900 dark:text-gray-100 hover:text-green-600 dark:hover:text-green-400 transition-colors no-underline"
                      >
                        {item.标题}
                      </Link>
                    </h6>

                    {item.作者 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{item.作者}</span>
                      </div>
                    )}

                    {item.评分 && (
                      <div className="text-xs mt-auto pt-1.5 text-amber-500 tracking-wider">
                        {'★'.repeat(Math.round(item.评分 / 2))}{'☆'.repeat(5 - Math.round(item.评分 / 2))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

export default BookList
