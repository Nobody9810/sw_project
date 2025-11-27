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
    <aside className="sx-sidebar">
      <div className="sx-widget">
        <div className="sx-widget-header">
          <div className="sx-widget-icon">
            <i className="bi bi-bookmarks" aria-hidden="true" />
          </div>
          <h3 className="sx-widget-title">相关{sectionName || type}</h3>
        </div>
        <div className="sx-widget-content">
          {items.map(item => (
            <div className="sx-related-item" key={item.id}>
              <Link to={`/${type}/${item.id}`} className="sx-related-link">
                <h4 className="sx-related-title">{item.标题}</h4>
                {item.更新时间 && (
                  <div className="sx-related-meta">
                    <i className="bi bi-calendar3 me-1" aria-hidden="true" />
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


