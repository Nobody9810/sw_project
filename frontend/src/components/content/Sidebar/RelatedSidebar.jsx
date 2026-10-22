import { SIDEBAR_LIST_BODY, SIDEBAR_ROW, SIDEBAR_ARTICLE_TITLE, SIDEBAR_DATE } from '@/lib/contentLayout'
import { articlePath } from '@/lib/articleUrl'
import React, { useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import { Bookmark, Calendar } from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { formatDateToChinese } from '@/lib/dateFormatter'
import SidebarCard from './SidebarCard'
import LoadingState from '@/components/common/LoadingState'
import RequestError from '@/components/common/RequestError'
import { requestErrorMessage } from '@/lib/requestError'

function RelatedSidebar({ type, currentId, sectionName }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!type) {
      return
    }
    let mounted = true
    const controller = new AbortController()
    setItems([])
    setLoading(true)
    setError('')

    const fetchRelated = async () => {
      try {
        const response = await apiClient.get(`/${type}/`, {
          params: { page_size: 6 },
          signal: controller.signal,
        })
        const data = response.data?.results ?? response.data ?? []
        if (mounted) {
          const filtered = data.filter(item => item.id !== Number(currentId))
          setItems(filtered.slice(0, 5))
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('加载推荐内容失败', error)
        if (mounted) {
          setError(requestErrorMessage(error))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchRelated()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [type, currentId, attempt])

  if (!type || (!loading && !error && !items.length)) {
    return null
  }

  return (
    <SidebarCard title={`相关${sectionName || type}`} icon={Bookmark} bodyClassName={SIDEBAR_LIST_BODY}>
          {loading ? <LoadingState kind="recent" label="正在加载推荐…" count={5} /> : error ? <RequestError message={error} onRetry={() => setAttempt(value => value + 1)} /> : items.map((item, index) => (
            <div
              key={item.id}
              className={`${SIDEBAR_ROW} ${
                index !== items.length - 1
                  ? 'border-b border-gray-100 dark:border-night-700'
                  : ''
              }`}
            >
              <Link
                href={articlePath(type, item)}
                className="group block rounded text-[#333] no-underline transition-colors hover:text-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:text-night-200 dark:hover:text-sage-400"
              >
                <h3 className={SIDEBAR_ARTICLE_TITLE}>
                  {item.标题}
                </h3>
                {item.更新时间 && (
                  <time className={`${SIDEBAR_DATE} flex items-center gap-1`}>
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    {formatDateToChinese(item.更新时间)}
                  </time>
                )}
              </Link>
            </div>
          ))}
    </SidebarCard>
  )
}

export default RelatedSidebar


