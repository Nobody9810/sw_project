import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../utils/apiClient'
import { formatDateToChinese } from '../utils/dateFormatter'
import BookCarousel from '../components/BookCarousel'

const SECTIONS = [
  { key: '书评', title: '书评', link: '/书评', authorField: '作者' },
  { key: '观点', title: '观点', link: '/观点', authorField: '作者' },
  { key: '译林', title: '译林', link: '/译林', authorField: '原文作者' },
  { key: '文艺', title: '文艺', link: '/文艺', authorField: '作者' },
  { key: '通讯', title: '通讯', link: '/通讯', authorField: '作者' },
  { key: '文史', title: '文史', link: '/文史', authorField: '作者' },
]

const stripHTML = (html = '') => {
  if (!html) return ''
  let text = html.replace(/<[^>]*>/g, '')
  text = text.replace(/&nbsp;/g, ' ').replace(/&[a-zA-Z]+;/g, ' ')
  return text.replace(/\s+/g, ' ').trim()
}

function HomePage() {
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

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const signal = controller.signal

    const fetchAllData = async () => {
      const endpoints = [
        { key: '书讯', url: '/书讯/', params: { page_size: 10 } },
        { key: '书库', url: '/书库/', params: { page_size: 10 } },
        { key: '书评', url: '/书评/', params: { page_size: 10 } },
        { key: '观点', url: '/观点/', params: { page_size: 10 } },
        { key: '译林', url: '/译林/', params: { page_size: 10 } },
        { key: '文艺', url: '/文艺/', params: { page_size: 10 } },
        { key: '文史', url: '/文史/', params: { page_size: 10 } },
        { key: '通讯', url: '/通讯/', params: { page_size: 10 } },
        { key: 'qa', url: '/qa/questions/', params: { limit: 3 } }
      ]

      // 🔥 关键优化1: 并行请求所有数据
      const promises = endpoints.map(endpoint =>
        apiClient.get(endpoint.url, { 
          params: endpoint.params,
          signal: signal // 🔥 关键优化2: 支持取消
        })
        .then(response => {
          if (!isMounted) return null
          
          const resultList = response.data.results || response.data || []
          
          // 🔥 关键优化3: 每个请求完成后立即更新UI (渐进式加载)
          setData(prev => ({
            ...prev,
            [endpoint.key]: resultList
          }))
          
          // 标记该部分加载完成
          setLoadingStates(prev => ({
            ...prev,
            [endpoint.key]: false
          }))
          
          return { key: endpoint.key, data: resultList }
        })
        .catch(err => {
          // 忽略取消错误
          if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
            return null
          }
          
          if (isMounted) {
            console.error(`Fetching ${endpoint.key} failed:`, err)
            // 失败也要标记为加载完成,避免一直显示loading
            setLoadingStates(prev => ({
              ...prev,
              [endpoint.key]: false
            }))
          }
          
          return { key: endpoint.key, data: [] }
        })
      )

      // 等待所有请求完成(或失败)
      await Promise.allSettled(promises)
    }

    fetchAllData()

    // 🔥 关键优化4: 组件卸载时取消所有请求
    return () => {
      isMounted = false
      controller.abort()
      console.log('HomePage unmounted - all requests cancelled')
    }
  }, []) // 空依赖,只在组件挂载时执行一次

  const topBook = data.书讯?.[0]
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
      {/* 第一行:新书推荐(60%) + 书讯(40%) */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* 新书推荐 - 60% */}
        <div className="w-full lg:w-[60%]">
          {loadingStates.书讯 ? (
            // 骨架屏
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full animate-pulse">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-[40%] h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ) : topBook ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <img
                  src={topBook.图片 || '/assets/images/default-placeholder.png'}
                  alt={topBook.标题}
                  className="w-full sm:w-[40%] h-auto object-cover rounded"
                  loading="eager"
                  onError={(e) => {
                    e.target.src = '/assets/images/default-placeholder.png'
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm bg-green-600 text-white mb-2 font-semibold px-2 py-1 rounded inline-block">新书推荐</div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                    <Link to={`/书讯/${topBook.id}`}>{topBook.标题}</Link>
                  </h2>
                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
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
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {stripHTML(topBook.内容).slice(0, 200)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              暂无书讯数据
            </div>
          )}
        </div>

        {/* 书讯 - 40% */}
        <div className="w-full lg:w-[40%]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">书讯</h3>
              <Link to="/书讯" className="text-green-600 dark:text-green-400 hover:underline text-sm">
                更多 ›
              </Link>
            </div>
            <div className="space-y-2 flex-1 mt-2">
              {loadingStates.书讯 ? (
                // 骨架屏
                [...Array(5)].map((_, i) => (
                  <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-2 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))
              ) : (
                (data.书讯 || []).slice(1, 6).map(item => (
                  <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                    <Link 
                      to={`/书讯/${item.id}`}
                      className="block hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2"
                    >
                      {item.标题}
                    </Link>
                    {item.作者 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.作者}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 第二行:书库 */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b" style={{ borderColor: '#fd7e14' }}>
            <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">书库</h3>
            <Link to="/书库" className="text-green-600 dark:text-green-400 hover:underline text-sm">
              更多 ›
            </Link>
          </div>
          {loadingStates.书库 ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : (
            <BookCarousel books={data.书库 || []} itemsPerSlide={5} />
          )}
        </div>
      </div>

      {/* 第三行:两列布局 */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[70%] space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryBlock data={data['书评']} title="书评" link="/书评" authorField="作者" loading={loadingStates.书评} />
            <CategoryBlock data={data['观点']} title="观点" link="/观点" authorField="作者" loading={loadingStates.观点} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">近期问答</h3>
              <div className="flex items-center gap-3">
                <Link to="/问答" className="text-green-600 dark:text-green-400 hover:underline text-sm">提问</Link>
                <Link to="/问答" className="text-green-600 dark:text-green-400 hover:underline text-sm">更多 ›</Link>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {loadingStates.qa ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-2 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))
              ) : (
                (data.qa || []).slice(0, 3).map(item => (
                  <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                    <Link to="/问答" className="block hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2">
                      {item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content}
                    </Link>
                  </div>
                ))
              )}
              {!loadingStates.qa && (!data.qa || data.qa.length === 0) && (
                <div className="text-gray-500 dark:text-gray-400 py-3 text-center">暂无问答</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryBlock data={data['译林']} title="译林" link="/译林" authorField="原文作者" loading={loadingStates.译林} />
            <CategoryBlock data={data['文艺']} title="文艺" link="/文艺" authorField="作者" loading={loadingStates.文艺} />
          </div>
        </div>

        <div className="w-full lg:w-[30%] flex flex-col space-y-6">
          <CategoryBlock data={data['通讯']} title="通讯" link="/通讯" authorField="作者" hideFirst={false} itemCount={7} loading={loadingStates.通讯} />
          <CategoryBlock data={data['文史']} title="文史" link="/文史" authorField="作者" hideFirst={false} itemCount={7} loading={loadingStates.文史} />
        </div>
      </div>
    </div>
  )
}

function CategoryBlock({ data = [], title, link, authorField, hideFirst = false, itemCount = 5, loading = false }) {
  const getAuthor = (item) => {
    if (title === '译林') {
      return item.原文作者 || item.作者 || ''
    }
    return item[authorField] || ''
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col h-full animate-pulse">
        <div className="flex justify-between items-center mb-0 pb-2 -mx-3 px-3 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
        </div>
        <div className="space-y-2 flex-1 mt-2">
          {[...Array(itemCount)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col h-full">
        <div className="flex justify-between items-center mb-0 pb-2 -mx-3 px-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">{title}</h3>
          <Link to={link} className="text-green-600 dark:text-green-400 hover:underline text-sm">更多 ›</Link>
        </div>
        <div className="text-gray-500 dark:text-gray-400 py-3 text-center text-sm flex-1 mt-2">暂无内容</div>
      </div>
    )
  }

  const [first, ...rest] = data
  const listItems = hideFirst ? data : rest
  const displayCount = itemCount || (hideFirst ? 8 : 5)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col h-full">
      <div className="flex justify-between items-center mb-0 pb-2 -mx-3 px-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[1em] before:w-1 before:bg-green-600 before:rounded-full">{title}</h3>
        <Link to={link} className="text-green-600 dark:text-green-400 hover:underline text-sm">更多 ›</Link>
      </div>
      <div className="space-y-2 flex-1 mt-2">
        {!hideFirst && first && (
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <Link to={`${link}/${first.id}`} className="block font-semibold hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2 mb-1">
              {first.标题}
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
              {stripHTML(first.内容).slice(0, 120)}
            </p>
            {getAuthor(first) && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{getAuthor(first)}</div>
            )}
          </div>
        )}
        {listItems.slice(0, displayCount).map(item => (
          <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-1.5 last:border-0">
            <Link to={`${link}/${item.id}`} className="block hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2 text-sm">
              {item.标题}
            </Link>
            {getAuthor(item) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getAuthor(item)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
