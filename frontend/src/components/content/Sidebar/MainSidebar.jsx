import { SIDEBAR_LIST_BODY, SIDEBAR_ROW, SIDEBAR_ARTICLE_TITLE, SIDEBAR_DATE } from '@/lib/contentLayout'
import { articlePath } from '@/lib/articleUrl'
import React, { useEffect, useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { Clock3, Library, RefreshCw } from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { formatDateToChinese } from '@/lib/dateFormatter'
import BookReviewCategorySidebar from './BookReviewCategorySidebar'
import DailyHadithCard from './DailyHadithCard'
import SidebarCard from './SidebarCard'
import RelatedSidebar from './RelatedSidebar'
import LoadingState from '@/components/common/LoadingState'

const SIDEBAR_SECTIONS = [
  {
    title: '近期文章',
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

// 侧边栏数据缓存 - 5分钟过期
// 使用 sessionStorage 持久化缓存，避免页面刷新后丢失
const sidebarCache = {
  CACHE_KEY: 'sidebar_data_cache',
  TTL: 5 * 60 * 1000, // 5分钟

  get() {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY)
      if (!cached) return null
      
      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()
      
      // 检查是否过期
      if (data && (now - timestamp) < this.TTL) {
        return data
      } else {
        // 过期了，清除缓存
        this.clear()
        return null
      }
    } catch (e) {
      // 解析失败，清除缓存
      this.clear()
      return null
    }
  },

  set(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
    } catch (e) {
      // sessionStorage 可能不可用（隐私模式等），静默失败
      console.warn('无法保存侧边栏缓存:', e)
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(this.CACHE_KEY)
    } catch (e) {
      // 忽略错误
    }
  }
}

function MainSidebar({ type, currentId, categoriesResource }) {
  const [sidebarData, setSidebarData] = useState({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const location = useLocation()
  
  let decodedPath = location.pathname
  try { decodedPath = decodeURIComponent(decodedPath) } catch { /* Keep malformed URLs usable. */ }
  const isBookReviewPage = type === '书评' || decodedPath.startsWith('/书评')

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    const fetchSidebarData = async () => {
      setFailed(false)
      // 先检查缓存
      const cachedData = sidebarCache.get()
      if (cachedData) {
        if (mounted) {
          setSidebarData(cachedData)
          setLoading(false)
        }
        return
      }

      // 如果没有缓存，先显示空状态（不阻塞页面）
      if (mounted) {
        setLoading(true)
      }

      try {
        const sources = SIDEBAR_SECTIONS.flatMap(section => section.sources)
        const response = await apiClient.get('/home/feed/', {
          params: { limit: 1, modules: sources.map(source => source.type).join(',') },
          signal: controller.signal,
        })
        if (mounted) {
          const dataMap = response.data.feed || {}

          // 更新缓存
          sidebarCache.set(dataMap)
          
          setSidebarData(dataMap)
          setLoading(false)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('加载侧边栏失败', error)
        if (mounted) {
          setLoading(false)
          setFailed(true)
        }
      }
    }

    void fetchSidebarData()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [attempt])


  return (
    <div className="space-y-3">
      <DailyHadithCard />
      {isBookReviewPage && <BookReviewCategorySidebar resource={categoriesResource} />}
      {type && currentId && <RelatedSidebar type={type} currentId={currentId} sectionName={type} />}
      {SIDEBAR_SECTIONS.map((section, index) => {
        const items = section.sources.flatMap(source => (sidebarData[source.type] || []).map(item => ({ ...item, source })))
        return <SidebarCard key={section.title} title={section.title} icon={index === 0 ? Clock3 : Library} bodyClassName={SIDEBAR_LIST_BODY}>
          {loading ? <LoadingState kind="recent" label={`正在加载${section.title}…`} count={section.sources.length} /> : failed ? <div role="alert" className="py-4 text-xs text-gray-500 dark:text-night-400">
            <p>内容暂时无法加载</p>
            <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 inline-flex items-center gap-1 text-green-700 dark:text-sage-400">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />重新加载
            </button>
          </div> : items.length ? <ul className="divide-y divide-gray-100 dark:divide-night-700">
            {items.map(item => <li key={`${item.source.type}-${item.id}`} className={SIDEBAR_ROW}>
              <Link href={articlePath(item.source.type, item)} className="group block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                <h3 className={SIDEBAR_ARTICLE_TITLE}>{item.标题}</h3>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-green-700 dark:text-sage-400">{item.source.label}</span>
                  {item.更新时间 && <time className={SIDEBAR_DATE}>{formatDateToChinese(item.更新时间)}</time>}
                </div>
              </Link>
            </li>)}
          </ul> : <p className="py-4 text-xs text-gray-500 dark:text-night-400">暂无内容</p>}
        </SidebarCard>
      })}
    </div>
  )
}

export default MainSidebar
