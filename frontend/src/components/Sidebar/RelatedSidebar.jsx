import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../utils/apiClient'

function RelatedSidebar({ type, currentId, sectionName }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!type) {
      return
    }
    let mounted = true

    const fetchRelated = async () => {
      try {
        const response = await apiClient.get(`/${type}/`, {
          params: { page_size: 6 },
        })
        const data = response.data?.results ?? response.data ?? []
        if (mounted) {
          const filtered = data.filter(item => item.id !== Number(currentId))
          setItems(filtered.slice(0, 5))
        }
      } catch (error) {
        console.error('加载推荐内容失败', error)
        if (mounted) {
          setItems([])
        }
      }
    }

    fetchRelated()

    return () => {
      mounted = false
    }
  }, [type, currentId])

  if (!items.length) {
    return null
  }

  return (
    <aside style={{ position: 'relative' }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-4 overflow-hidden" style={{ position: 'relative' }}>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <div className="text-green-600 dark:text-green-400">
            <i className="bi bi-bookmarks" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium m-0 text-gray-800 dark:text-gray-200">
            相关{sectionName || type}
          </h3>
        </div>
        <div className="p-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`py-2 ${
                index !== items.length - 1
                  ? 'border-b border-gray-200 dark:border-gray-700'
                  : ''
              }`}
            >
              <Link
                to={`/${type}/${item.id}`}
                className="block text-gray-800 dark:text-gray-200 no-underline transition-all duration-300 hover:text-green-600 dark:hover:text-green-400 hover:translate-x-1"
              >
                <h4 className="text-sm font-medium mb-1 leading-snug m-0">
                  {item.标题}
                </h4>
                {item.更新时间 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <i className="bi bi-calendar3" aria-hidden="true" />
                    {new Date(item.更新时间).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default RelatedSidebar


