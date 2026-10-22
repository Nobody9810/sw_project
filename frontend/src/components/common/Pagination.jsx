import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function Pagination({ page, totalPages, onPageChange, loading = false, compactMobile = false }) {
  const handleChange = (newPage) => {
    if (loading || newPage < 1 || newPage > totalPages || newPage === page) {
      return
    }
    onPageChange(newPage)
  }

  // 计算要显示的页码
  const visiblePages = useMemo(() => {
    const pages = []
    const maxVisible = 7 // 最多显示7个页码按钮
    
    if (totalPages <= maxVisible) {
      // 如果总页数少于等于7，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 如果总页数大于7，智能显示页码
      if (page <= 4) {
        // 当前页在前4页，显示前5页 + ... + 最后一页
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      } else if (page >= totalPages - 3) {
        // 当前页在后4页，显示第一页 + ... + 后5页
        pages.push(1)
        pages.push('ellipsis')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // 当前页在中间，显示第一页 + ... + 当前页附近3页 + ... + 最后一页
        pages.push(1)
        pages.push('ellipsis')
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }
    return pages
  }, [page, totalPages])

  if (totalPages <= 1) return null

  return (
    <>
    {compactMobile && <nav aria-label="手机分页导航" aria-busy={loading} className="mt-6 flex items-center justify-between gap-3 sm:hidden">
      <button type="button" aria-label="上一页" disabled={loading || page === 1} onClick={() => handleChange(page - 1)}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:bg-night-800 dark:text-night-200"><ChevronLeft className="h-4 w-4" aria-hidden="true" />上一页</button>
      <span aria-live="polite" className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-night-400">{page} / {totalPages}</span>
      <button type="button" aria-label="下一页" disabled={loading || page === totalPages} onClick={() => handleChange(page + 1)}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-green-700 bg-green-700 px-3 text-sm font-medium text-white transition-colors enabled:hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sage-600 dark:bg-sage-600 dark:enabled:hover:bg-sage-700">下一页<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
    </nav>}
    <nav aria-label="分页导航" aria-busy={loading} className={`${compactMobile ? 'hidden sm:flex' : 'flex'} justify-center items-center mt-8 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-60`}>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* 上一页按钮 */}
        <button
          type="button"
          onClick={() => handleChange(page - 1)}
          disabled={loading || page === 1}
          aria-label="上一页"
          className={`
            flex items-center gap-1 px-3 py-2 rounded-lg
            text-sm font-medium transition-all duration-200
            border border-green-600
            ${page === 1
              ? 'bg-gray-100 dark:bg-night-700 text-gray-400 dark:text-night-500 border-gray-300 dark:border-night-600 cursor-not-allowed'
              : 'bg-white dark:bg-night-800 text-green-600 dark:text-sage-400 hover:bg-green-600 hover:text-white dark:hover:bg-sage-600 dark:hover:text-white'
            }
          `}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">上一页</span>
        </button>

        {/* 页码按钮 */}
        <div className="flex items-center gap-1">
          {visiblePages.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-2 text-gray-400 dark:text-night-500"
                >
                  ...
                </span>
              )
            }

            const isActive = pageNum === page
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => handleChange(pageNum)}
                aria-label={`第 ${pageNum} 页`}
                aria-current={isActive ? 'page' : undefined}
                disabled={loading}
                className={`
                  min-w-[40px] h-10 px-3 py-2 rounded-lg
                  text-sm font-medium transition-all duration-200
                  border
                  ${isActive
                    ? 'bg-green-600 text-white border-green-600 shadow-md'
                    : 'bg-white dark:bg-night-800 text-green-600 dark:text-sage-400 border-green-600 hover:bg-green-50 dark:hover:bg-sage-900/20'
                  }
                `}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* 下一页按钮 */}
        <button
          type="button"
          onClick={() => handleChange(page + 1)}
          disabled={loading || page === totalPages}
          aria-label="下一页"
          className={`
            flex items-center gap-1 px-3 py-2 rounded-lg
            text-sm font-medium transition-all duration-200
            border border-green-600
            ${page === totalPages
              ? 'bg-gray-100 dark:bg-night-700 text-gray-400 dark:text-night-500 border-gray-300 dark:border-night-600 cursor-not-allowed'
              : 'bg-white dark:bg-night-800 text-green-600 dark:text-sage-400 hover:bg-green-600 hover:text-white dark:hover:bg-sage-600 dark:hover:text-white'
            }
          `}
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
    </>
  )
}

export default Pagination


