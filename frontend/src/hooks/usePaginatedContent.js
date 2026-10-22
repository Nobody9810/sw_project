import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'
import { requestErrorMessage } from '@/lib/requestError'
import { usePageReady } from '@/components/common/PageLoadContext'

export default function usePaginatedContent(url, pageSize) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  usePageReady(loading)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const load = async () => {
      try {
        const response = await apiClient.get(url, { params: { page, page_size: pageSize }, signal: controller.signal })
        if (response.data?.success === false) {
          if (active) setError(response.data.message || '内容加载失败，请重试')
          return
        }
        if (active) setData(response.data)
      } catch (failure) {
        if (active && !controller.signal.aborted) setError(requestErrorMessage(failure))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false; controller.abort() }
  }, [url, pageSize, page, attempt])

  const changePage = nextPage => {
    if (loading || nextPage === page) return
    setLoading(true)
    setError('')
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const retry = () => { setLoading(true); setError(''); setAttempt(value => value + 1) }
  const items = data?.results ?? (Array.isArray(data) ? data : [])
  const count = data?.count ?? items.length
  const totalPages = data?.total_pages ?? Math.ceil(count / pageSize)
  const placeholderCount = data === null ? pageSize : Math.max(1, Math.min(pageSize, count - (page - 1) * pageSize))
  return { data, items, count, totalPages, page, loading, error, placeholderCount, changePage, retry }
}
