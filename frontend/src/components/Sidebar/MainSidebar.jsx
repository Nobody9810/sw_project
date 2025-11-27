import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../utils/apiClient'

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
    <div className="sidebar-sections">
      {SIDEBAR_SECTIONS.map(section => (
        <div className="sidebar-section" key={section.title}>
          <div className="sidebar-header">
            <h4 className="sidebar-title">{section.title}</h4>
          </div>
          <div className="hot-articles">
            {section.sources.map(source => (
              (sidebarData[source.type] || []).map(item => (
                <div className="hot-item" key={`${source.type}-${item.id}`}>
                  <Link to={`/${source.type}/${item.id}`} className="hot-link">
                    <h5 className="hot-title">{item.标题}</h5>
                    <div className="hot-meta">
                      <span className="hot-source">{source.label}</span>
                      {item.更新时间 && (
                        <span className="hot-date">
                          {new Date(item.更新时间).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              ))
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MainSidebar


