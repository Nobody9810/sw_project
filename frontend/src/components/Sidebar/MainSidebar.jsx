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

function MainSidebar() {
  const [sidebarData, setSidebarData] = useState({})
  const location = useLocation()
  
  // 判断是否在书评相关页面（处理URL编码）
  const decodedPath = decodeURIComponent(location.pathname)
  const isBookReviewPage = decodedPath.startsWith('/书评') || decodedPath.includes('书评') || 
                           location.pathname.includes('%E4%B9%A6%E8%AF%84') || // URL编码的"书评"
                           location.pathname.startsWith('/%E4%B9%A6%E8%AF%84')

  useEffect(() => {
    let mounted = true

    const fetchSidebarData = async () => {
      try {
        const requests = SIDEBAR_SECTIONS.flatMap(section =>
          section.sources.map(async (source) => {
            try {
              const response = await apiClient.get(`/${source.type}/`, {
                params: { page_size: 1 },
              })
              const items = response.data?.results ?? response.data ?? []
              return { type: source.type, items }
            } catch (error) {
              console.error(`加载${source.type}侧边数据失败`, error)
              return { type: source.type, items: [] }
            }
          })
        )

        const results = await Promise.all(requests)
        if (mounted) {
          const dataMap = results.reduce((acc, { type, items }) => {
            acc[type] = items
            return acc
          }, {})
          setSidebarData(dataMap)
        }
      } catch (error) {
        console.error('加载侧边栏失败', error)
      }
    }

    fetchSidebarData()

    return () => {
      mounted = false
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
            {section.sources.map(source =>
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
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MainSidebar


