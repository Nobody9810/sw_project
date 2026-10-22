import { usePageReady } from '@/components/common/PageLoadContext'
import { articlePath } from '@/lib/articleUrl'
import { HOME_FEATURED_CARD, HOME_FEATURED_CONTENT } from '@/lib/contentLayout'
import React, { useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import apiClient from '@/lib/apiClient'
import { formatDateToChinese } from '@/lib/dateFormatter'
import RequestError from '@/components/common/RequestError'
import { requestErrorMessage } from '@/lib/requestError'
import BookCarousel from '@/components/content/BookCarousel'
import LoadingState from '@/components/common/LoadingState'
import CoverImage from '@/components/content/CoverImage'

const SECTIONS = [
  { key: '书评', title: '书评', link: '/书评', authorField: '作者' },
  { key: '观点', title: '观点', link: '/观点', authorField: '作者' },
  { key: '译林', title: '译林', link: '/译林', authorField: '原文作者' },
  { key: '文艺', title: '文艺', link: '/文艺', authorField: '作者' },
  { key: '通讯', title: '通讯', link: '/通讯', authorField: '作者' },
  { key: '文史', title: '文史', link: '/文史', authorField: '作者' },
]

const FEED_KEYS = ['书讯', '书库', ...SECTIONS.map(section => section.key)]

const stripHTML = (html = '') => {
  if (!html) return ''
  let text = html.replace(/<[^>]*>/g, '')
  text = text.replace(/&nbsp;/g, ' ').replace(/&[a-zA-Z]+;/g, ' ')
  return text.replace(/\s+/g, ' ').trim()
}

function HomePage() {
  const [errors, setErrors] = useState({ feed: '', qa: '' })
  const [feedAttempt, setFeedAttempt] = useState(0)
  const [qaAttempt, setQaAttempt] = useState(0)
  // 初始化所有数据为空数组
  const [data, setData] = useState({
    书讯: [],
    书库: [],
    书评: [],
    观点: [],
    译林: [],
    文艺: [],
    通讯: [],
    文史: [],
    qa: []
  })

  // 分别跟踪每个部分的加载状态
  const [loadingStates, setLoadingStates] = useState({
    书讯: true,
    书库: true,
    书评: true,
    观点: true,
    译林: true,
    文艺: true,
    通讯: true,
    文史: true,
    qa: true
  })

  usePageReady(loadingStates.书讯)

  // Feed and questions are independent: retry only the region that failed.
  useEffect(() => {
    const controller = new AbortController()
    setErrors(previous => ({ ...previous, feed: '' }))
    setLoadingStates(previous => ({ ...previous, ...Object.fromEntries(FEED_KEYS.map(key => [key, true])) }))
    const load = async () => {
      try {
        const response = await apiClient.get('/home/feed/', { params: { limit: 12, modules: FEED_KEYS.join(',') }, signal: controller.signal })
        if (!controller.signal.aborted) setData(previous => ({ ...previous, ...(response.data?.feed || {}) }))
      } catch (error) {
        if (!controller.signal.aborted) setErrors(previous => ({ ...previous, feed: requestErrorMessage(error, '首页内容加载失败，请重试') }))
      } finally {
        if (!controller.signal.aborted) setLoadingStates(previous => ({ ...previous, ...Object.fromEntries(FEED_KEYS.map(key => [key, false])) }))
      }
    }
    void load()
    return () => controller.abort()
  }, [feedAttempt])

  useEffect(() => {
    const controller = new AbortController()
    setErrors(previous => ({ ...previous, qa: '' }))
    setLoadingStates(previous => ({ ...previous, qa: true }))
    const load = async () => {
      try {
        const response = await apiClient.get('/qa/questions/', { params: { limit: 3 }, signal: controller.signal })
        const payload = response.data
        if (!controller.signal.aborted) setData(previous => ({ ...previous, qa: Array.isArray(payload) ? payload : (payload?.results || []) }))
      } catch (error) {
        if (!controller.signal.aborted) setErrors(previous => ({ ...previous, qa: requestErrorMessage(error, '问答加载失败，请重试') }))
      } finally {
        if (!controller.signal.aborted) setLoadingStates(previous => ({ ...previous, qa: false }))
      }
    }
    void load()
    return () => controller.abort()
  }, [qaAttempt])

  const topBook = data.书讯?.[0]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
      {errors.feed && <RequestError message={errors.feed} onRetry={() => setFeedAttempt(value => value + 1)} />}
      {/* 第一行:新书推荐(60%) + 书讯(40%) */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* 新书推荐 - 60% */}
        <div className="w-full lg:w-[60%] lg:flex lg:flex-col">
          {loadingStates.书讯 ? (
            <LoadingState kind="featured-book" label="正在加载新书推荐…" className="h-full" />
          ) : topBook ? (
            <div className={HOME_FEATURED_CARD}>
              <div className={HOME_FEATURED_CONTENT}>
                <div className="w-full sm:w-[40%] shrink-0 lg:relative overflow-hidden rounded">
                  <CoverImage src={topBook.图片} alt={topBook.标题} kind="book" label="书讯" loading="eager"
                    className="block w-full h-auto object-cover lg:absolute lg:inset-0 lg:h-full"
                    placeholderClassName="aspect-[2/3] w-full lg:absolute lg:inset-0 lg:h-full lg:aspect-auto" />
                </div>
                <div className="flex-1 min-w-0 lg:flex lg:flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm bg-green-600 text-white font-semibold px-2 py-1 rounded inline-block">新书推荐</div>
                    {topBook.is_for_sale && (
                      <div className="flex items-center gap-1 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-2 py-1 rounded inline-block">
                        现货出售
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 hover:text-green-600 dark:hover:text-sage-400 transition-colors">
                    <Link href={articlePath("书讯", topBook)}>{topBook.标题}</Link>
                  </h2>

                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-night-300">
                    {topBook.作者 && topBook.作者.trim() && (
                      <div>
                        <span className="font-medium">作者：</span>
                        <span>{topBook.作者}</span>
                      </div>
                    )}
                    {topBook.出版社 && topBook.出版社 !== '暂无' && topBook.出版社.trim() && (
                      <div>
                        <span className="font-medium">出版社：</span>
                        <span>{topBook.出版社}</span>
                      </div>
                    )}
                    {topBook.出版年 && (
                      <div>
                        <span className="font-medium">出版日期：</span>
                        <span>
                          {(() => {
                            try {
                              if (typeof topBook.出版年 === 'string') {
                                const date = new Date(topBook.出版年)
                                return isNaN(date.getTime()) ? topBook.出版年 : formatDateToChinese(topBook.出版年)
                              }
                              return String(topBook.出版年)
                            } catch (e) {
                              return String(topBook.出版年)
                            }
                          })()}
                        </span>
                      </div>
                    )}
                    {topBook.ISBN && topBook.ISBN !== '暂无' && topBook.ISBN.trim() && (
                      <div>
                        <span className="font-medium">ISBN：</span>
                        <span>{topBook.ISBN}</span>
                      </div>
                    )}
                  </div>
                  {topBook.内容 && topBook.内容.trim() && topBook.内容 !== '暂无内容简介' && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-night-400 line-clamp-5">
                      {stripHTML(topBook.内容).slice(0, 200)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-night-800 rounded-lg shadow-lg border border-gray-200 dark:border-night-700 p-6 text-center text-gray-500">
              {errors.feed ? '书讯暂时无法加载' : '暂无书讯数据'}
            </div>
          )}
        </div>

        {/* 书讯 - 40% */}
        <div className="w-full lg:w-[40%] lg:flex lg:flex-col">
          <div className="bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-lg border-none sm:border border-gray-200 dark:border-night-700 p-0 sm:p-4 h-full flex flex-col lg:flex-1">
            <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b border-gray-200 dark:border-night-700">
              <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">书讯</h3>
              <Link href="/书讯" className="text-green-600 dark:text-sage-400 hover:underline text-sm">
                更多 ›
              </Link>
            </div>
            <div className="space-y-2 flex-1 mt-2">
              {loadingStates.书讯 ? (
                <LoadingState kind="home-news" label="正在加载书讯…" count={5} />
              ) : (data.书讯 || []).slice(1, 6).map(item => (
                <div key={item.id} className="border-b border-gray-200 dark:border-night-700 pb-2 last:border-0">
                  <Link
                    href={articlePath("书讯", item)}
                    className="flex items-center gap-1.5 hover:text-green-600 dark:hover:text-sage-400 transition-colors"
                  >
                    <span className="line-clamp-2">{item.标题}</span>
                    {item.is_for_sale && (
                      <span className="flex-shrink-0 text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                        在售
                      </span>
                    )}
                  </Link>
                  {item.作者 && (
                    <div className="text-sm text-gray-500 dark:text-night-400 mt-1">
                      {item.作者}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 第二行:书库 */}
      <div className="mb-8">
        <div className="bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-lg border-none sm:border border-gray-200 dark:border-night-700 p-0 sm:p-4">
          <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b" style={{ borderColor: '#fd7e14' }}>
            <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">书库</h3>
            <Link href="/书库" className="text-green-600 dark:text-sage-400 hover:underline text-sm">
              更多 ›
            </Link>
          </div>
          {loadingStates.书库 ? (
            <LoadingState kind="carousel" label="正在加载书库…" />
          ) : (
            errors.feed && !data.书库?.length ? <p className="py-8 text-center text-sm text-gray-500">书库暂时无法加载，请点击上方重试</p> : <BookCarousel books={data.书库 || []} itemsPerSlide={5} desktopBookLimit={10} />
          )}
        </div>
      </div>

      {/* 第三行:两列布局 */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[70%] space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryBlock data={data['书评']} title="书评" link="/书评" authorField="作者" error={errors.feed} loading={loadingStates.书评} />
            <CategoryBlock data={data['观点']} title="观点" link="/观点" authorField="作者" error={errors.feed} loading={loadingStates.观点} />
          </div>

          <div className="bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-lg border-none sm:border border-gray-200 dark:border-night-700 p-0 sm:p-4">
            <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b border-gray-200 dark:border-night-700">
              <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">近期问答</h3>
              <div className="flex items-center gap-3">
                <Link href="/问答" className="text-green-600 dark:text-sage-400 hover:underline text-sm">提问</Link>
                <Link href="/问答" className="text-green-600 dark:text-sage-400 hover:underline text-sm">更多 ›</Link>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {errors.qa ? <RequestError message={errors.qa} onRetry={() => setQaAttempt(value => value + 1)} /> : loadingStates.qa ? (
                <LoadingState kind="home-qa" label="正在加载问答…" count={3} />
              ) : (
                (data.qa || []).slice(0, 3).map(item => (
                  <div key={item.id} className="border-b border-gray-200 dark:border-night-700 pb-2 last:border-0">
                    <Link href="/问答" className="block hover:text-green-600 dark:hover:text-sage-400 transition-colors line-clamp-2">
                      {item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content}
                    </Link>
                  </div>
                ))
              )}
              {!errors.qa && !loadingStates.qa && (!data.qa || data.qa.length === 0) && (
                <div className="text-gray-500 dark:text-night-400 py-3 text-center">暂无问答</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryBlock data={data['译林']} title="译林" link="/译林" authorField="原文作者" error={errors.feed} loading={loadingStates.译林} />
            <CategoryBlock data={data['文艺']} title="文艺" link="/文艺" authorField="作者" error={errors.feed} loading={loadingStates.文艺} />
          </div>
        </div>

        <div className="w-full lg:w-[30%] flex flex-col space-y-6">
          <CategoryBlock data={data['通讯']} title="通讯" link="/通讯" authorField="作者" hideFirst={false} itemCount={7} error={errors.feed} loading={loadingStates.通讯} />
          <CategoryBlock data={data['文史']} title="文史" link="/文史" authorField="作者" hideFirst={false} itemCount={7} error={errors.feed} loading={loadingStates.文史} />
        </div>
      </div>
    </div>
  )
}

function CategoryBlock({ data = [], title, link, authorField, hideFirst = false, itemCount = 5, loading = false, error = '' }) {
  const getAuthor = (item) => {
    if (title === '译林') {
      return item.原文作者 || item.作者 || ''
    }
    return item[authorField] || ''
  }

  if (loading) {
    return <div className="bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-lg border-none sm:border border-gray-200 dark:border-night-700 p-0 sm:p-3 h-full">
      <h3 className="border-b border-gray-200 pb-2 text-lg font-bold dark:border-night-700">{title}</h3>
      <LoadingState kind="home-category" label={`正在加载${title}…`} count={itemCount} />
    </div>
  }

  if (!data.length) {
    return (
      <div className="bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-lg border-none sm:border border-gray-200 dark:border-night-700 p-0 sm:p-3 flex flex-col h-full">
        <div className="flex justify-between items-center mb-0 pb-2 -mx-3 px-3 border-b border-gray-200 dark:border-night-700">
          <h3 className="text-lg font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">{title}</h3>
          <Link href={link} className="text-green-600 dark:text-sage-400 hover:underline text-sm">更多 ›</Link>
        </div>
        <div className="text-gray-500 dark:text-night-400 py-3 text-center text-sm flex-1 mt-2">{error ? '内容暂时无法加载，请点击上方重试' : '暂无内容'}</div>
      </div>
    )
  }

  const [first, ...rest] = data
  const listItems = hideFirst ? data : rest
  const displayCount = itemCount || (hideFirst ? 8 : 5)

  return (
    <div className="bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-lg border-none sm:border border-gray-200 dark:border-night-700 p-0 sm:p-3 flex flex-col h-full">
      <div className="flex justify-between items-center mb-0 pb-2 -mx-3 px-3 border-b border-gray-200 dark:border-night-700">
        <h3 className="text-lg font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">{title}</h3>
        <Link href={link} className="text-green-600 dark:text-sage-400 hover:underline text-sm">更多 ›</Link>
      </div>
      <div className="space-y-2 flex-1 mt-2">
        {!hideFirst && first && (
          <div className="border-b border-gray-200 dark:border-night-700 pb-2">
            <Link href={articlePath(link, first)} className="block font-semibold hover:text-green-600 dark:hover:text-sage-400 transition-colors line-clamp-2 mb-1">
              {first.标题}
            </Link>
            <p className="text-sm text-gray-600 dark:text-night-400 line-clamp-2 mb-1">
              {stripHTML(first.内容).slice(0, 120)}
            </p>
            {getAuthor(first) && (
              <div className="text-xs text-gray-500 dark:text-night-400">{getAuthor(first)}</div>
            )}
          </div>
        )}
        {listItems.slice(0, displayCount).map(item => (
          <div key={item.id} className="border-b border-gray-200 dark:border-night-700 pb-1.5 last:border-0">
            <Link href={articlePath(link, item)} className="block hover:text-green-600 dark:hover:text-sage-400 transition-colors line-clamp-2 text-sm">
              {item.标题}
            </Link>
            {getAuthor(item) && (
              <div className="text-xs text-gray-500 dark:text-night-400 mt-1">{getAuthor(item)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
