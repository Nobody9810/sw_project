import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../utils/apiClient'
import MainSidebar from '../components/Sidebar/MainSidebar'
import Pagination from '../components/Pagination'

function BookLibrary() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0, pageSize: 13 })
  const pageSize = 13
  const type = '书库'

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get(`/${type}/`, {
          params: { page, page_size: pageSize },
        })
        const data = response.data || {}
        const list = data.results ?? (Array.isArray(data) ? data : [])
        const countValue = typeof data.count === 'number'
          ? data.count
          : list.length
        setBooks(list)
        setPagination({ count: countValue, pageSize })
      } catch (error) {
        console.error('加载书库失败', error)
        setBooks([])
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()
  }, [page])

  const totalPages = useMemo(() => {
    if (!pagination.count) {
      return books.length > 0 ? 1 : 0
    }
    return Math.ceil(pagination.count / pagination.pageSize)
  }, [pagination.count, pagination.pageSize, books.length])

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
        <div className="py-5 text-center text-muted">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row g-4">
        <div className="col-lg-9">
          <div className="grid-container">
            <div className="grid-list">
              {books.length === 0 && (
                <div className="text-center w-100 py-5 text-muted">暂无图书</div>
              )}
              {books.map(book => (
                <div className="grid-item" key={book.id}>
                  <div className="item-cover">
                    <img
                      src={book.图片 || '/static/images/default-placeholder.png'}
                      alt={book.标题}
                      loading="lazy"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                  <div className="item-content">
                    <h6 className="item-title">
                      <Link to={`/书库/${book.id}`}>{book.标题}</Link>
                    </h6>
                    <div className="item-meta">
                      {book.作者 && <span className="author">{book.作者}</span>}
                      {book.更新时间 && (
                        <span className="date">
                          {new Date(book.更新时间).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
        <div className="col-lg-3">
          <MainSidebar />
        </div>
      </div>
    </div>
  )
}

export default BookLibrary

