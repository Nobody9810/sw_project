import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import apiClient from '../utils/apiClient'

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
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return ''
    }
    return parsed.toLocaleString('zh-CN')
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
      <div className="container" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="py-5 text-center text-muted">搜索中...</div>
      </div>
    )
  }

  if (!keyword) {
    return (
      <div className="container" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="py-5 text-center text-muted">请输入关键词后再搜索。</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row mb-4 mt-4">
        <h2>
          <strong>搜索结果 {resultCount}:</strong>
        </h2>
      </div>

      {groupEntries.length === 0 && (
        <div className="alert alert-info">暂无相关内容，试试其他关键字。</div>
      )}

      {groupEntries.map(([category, items]) => (
        <div key={category}>
          <div className="row mb-4 mt-4">
            <h3>
              <strong>{category}&nbsp;{items.length}</strong>
            </h3>
          </div>
          <div className="row mb-4 mt-4">
            {items.map(item => (
              <div className="col-md-3 mb-3" key={`${category}-${item.id}`}>
                <Link to={`/${category}/${item.id}`} className="text-decoration-none">
                  <div className="card border h-100 bg-light rounded">
                    <div className="card-body p-3">
                      <small className="text-muted">标题</small>
                      <h4 className="card-title font-weight-bold">{item.标题}</h4>
                      <div className="card-date">
                        <small className="text-muted">
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

