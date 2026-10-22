import SiteSearchForm from '@/components/common/SiteSearchForm'
import { usePageReady } from '@/components/common/PageLoadContext'
import { articlePath } from '@/lib/articleUrl'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from '@/lib/navigation'
import RequestError from '@/components/common/RequestError'
import { requestErrorMessage } from '@/lib/requestError'
import apiClient from '@/lib/apiClient'
import PageSkeleton from '@/components/common/PageSkeleton'
import { formatDateToChinese } from '@/lib/dateFormatter'

function SearchResults() {
  const [searchParams] = useSearchParams()
  const keyword = searchParams.get('keyword')
  const [groupedResults, setGroupedResults] = useState({})
  const [loading, setLoading] = useState(true)
  usePageReady(loading)
  const [error, setError] = useState('')
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [resultCount, setResultCount] = useState(0)

  const formatDate = (value) => {
    if (!value) {
      return ''
    }
    return formatDateToChinese(value)
  }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const search = async () => {
      setError('')
      if (!keyword) {
        setGroupedResults({})
        setResultCount(0)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const response = await apiClient.get('/search/', {
          params: { keyword }, signal: controller.signal,
        })
        if (!active) return
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
        if (!active || error.code === 'ERR_CANCELED') return
        setError(requestErrorMessage(error, '搜索失败，请重试'))
        setGroupedResults({})
        setResultCount(0)
      } finally {
        if (active) setLoading(false)
      }
    }
    void search()
    return () => { active = false; controller.abort() }
  }, [keyword, retryAttempt])

  const groupEntries = useMemo(() => Object.entries(groupedResults), [groupedResults])

  if (loading) return <PageSkeleton kind="search" label="正在搜索…" />

  if (error) return <div className="w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8"><SiteSearchForm initialValue={keyword || ''} className="mt-6 sm:hidden" /><RequestError message={error} onRetry={() => setRetryAttempt(value => value + 1)} /></div>

  if (!keyword) {
    return (
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="w-full"><SiteSearchForm className="mb-6 sm:hidden" /><div className="py-5 text-center text-gray-500 dark:text-night-400">请输入关键词后再搜索。</div></div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
      <SiteSearchForm initialValue={keyword} className="mt-6 sm:hidden" />
      <div className="mb-4 mt-4">
        <h2 className="text-xl font-bold md:text-2xl text-gray-900 dark:text-night-100">
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-night-100">
              {category}&nbsp;{items.length}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4 mt-4">
            {items.map(item => (
              <div key={`${category}-${item.id}`} className="mb-3">
                <Link href={articlePath(category, item)} className="no-underline">
                  <div className="border border-gray-200 dark:border-night-700 h-full bg-gray-50 dark:bg-night-800 rounded-lg hover:shadow-md transition-shadow">
                    <div className="p-3">
                      <small className="hidden text-gray-500 dark:text-night-400 sm:inline">标题</small>
                      <h4 className="text-base font-bold text-gray-900 dark:text-night-100 mt-1 mb-2 sm:text-lg">{item.标题}</h4>
                      <div>
                        <small className="text-gray-500 dark:text-night-400">
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

