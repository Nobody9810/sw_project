import React from 'react'

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  const handleChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) {
      return
    }
    onPageChange(newPage)
  }

  return (
    <nav aria-label="分页导航" className="mt-4">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
          <button type="button" className="page-link" onClick={() => handleChange(page - 1)} aria-label="上一页">
            ‹ 上一页
          </button>
        </li>

        {pages.map(num => (
          <li key={num} className={`page-item ${num === page ? 'active' : ''}`}>
            <button type="button" className="page-link" onClick={() => handleChange(num)}>
              {num}
            </button>
          </li>
        ))}

        <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
          <button type="button" className="page-link" onClick={() => handleChange(page + 1)} aria-label="下一页">
            下一页 ›
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination


