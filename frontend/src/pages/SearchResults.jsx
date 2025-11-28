import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import apiClient from '../utils/apiClient'
import { formatDateToChinese } from '../utils/dateFormatter'

function SearchResults() {
  const [searchParams] = useSearchParams()
  const keyword = searchParams.get('keyword')
  const [groupedResults, setGroupedResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [resultCount, setResultCount] = useState(0)

  const formatDate = (value) => {
    if (!value) {
      return ''
    }
    return formatDateToChinese(value)
  }

  useEffect(() => {
    const search = async () => {
      if (!keyword) {
        setGroupedResults({})
        setResultCount(0)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const response = await apiClient.get('/search/', {
          params: { keyword },
        })
        const data = response.data || {}
        const grouped = (data.results || []).reduce((acc, item) => {
          const key = item.type || '其他'
          if (!acc[key]) {
            acc[key] = []
          }
          acc[key].push(item)
          return acc
        }, {})
        setGroupedResults(grouped)
        setResultCount(data.result_count ?? data.results?.length ?? 0)
      } catch (error) {
        console.error('搜索失败:', error)
        setGroupedResults({})
        setResultCount(0)
      } finally {
        setLoading(false)
      }
    }
    search()
  }, [keyword])

  const groupEntries = useMemo(() => Object.entries(groupedResults), [groupedResults])

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="py-5 text-center text-gray-500 dark:text-gray-400">搜索中...</div>
      </div>
    )
  }

  if (!keyword) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="py-5 text-center text-gray-500 dark:text-gray-400">请输入关键词后再搜索。</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-4 mt-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          搜索结果 {resultCount}:
        </h2>
      </div>

      {groupEntries.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg">
          暂无相关内容，试试其他关键字。
        </div>
      )}

      {groupEntries.map(([category, items]) => (
        <div key={category} className="mb-6">
          <div className="mb-4 mt-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {category}&nbsp;{items.length}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4 mt-4">
            {items.map(item => (
              <div key={`${category}-${item.id}`} className="mb-3">
                <Link to={`/${category}/${item.id}`} className="no-underline">
                  <div className="border border-gray-200 dark:border-gray-700 h-full bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
                    <div className="p-3">
                      <small className="text-gray-500 dark:text-gray-400">标题</small>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-1 mb-2">{item.标题}</h4>
                      <div>
                        <small className="text-gray-500 dark:text-gray-400">
                          {formatDate(item.更新时间)}
                        </small>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default SearchResults

