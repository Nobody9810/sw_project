import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../utils/apiClient'
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
  // 移除 HTML 标签
  let text = html.replace(/<[^>]*>/g, '')
  // 替换 HTML 实体（如 &nbsp;）为普通空格
  text = text.replace(/&nbsp;/g, ' ').replace(/&[a-zA-Z]+;/g, ' ')
  // 去除开头和结尾的空白，以及多余空白
  return text.replace(/\s+/g, ' ').trim()
}

function HomePage() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const types = ['书讯', '书评', '观点', '译林', '文艺', '文史', '通讯', '书库']
        const promises = types.map(type =>
          apiClient.get(`/${type}/`, { params: { page_size: type === '书库' ? 10 : 10 } }).catch(err => {
            console.error(`Error fetching ${type}:`, err)
            return { data: { results: [] } }
          })
        )
        
        // 获取最新问答
        const qaPromise = apiClient.get('/qa/questions/', { params: { limit: 3 } }).catch(err => {
          console.error('Error fetching QA:', err)
          return { data: { results: [] } }
        })

        const results = await Promise.all([...promises, qaPromise])

        if (!isMounted) return

        const newData = {}
        types.forEach((type, idx) => {
          const responseData = results[idx].data
          newData[type] = responseData?.results || responseData || []

        })
        
        // 处理问答数据
        const qaData = results[results.length - 1].data
        newData['qa'] = qaData?.results || qaData || []

        setData(newData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  const topBook = data.书讯?.[0]
  

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-500px)] flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
      {/* 第一行：新书推荐(60%) + 书讯(40%) */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* 新书推荐 - 60% */}
        <div className="w-full lg:w-[60%]">
          {topBook ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <img
                  src={topBook.图片 || '/static/images/default-placeholder.png'}
                  alt={topBook.标题}
                  className="w-full sm:w-[35%] h-auto object-cover rounded"
                  loading="lazy"
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
                                return isNaN(date.getTime()) ? topBook.出版年 : date.toLocaleDateString('zh-CN')
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
                    {topBook.页数 && topBook.页数 > 0 && (
                      <div>
                        <span className="font-medium">页数：</span>
                        <span>{topBook.页数}页</span>
                      </div>
                    )}
                    {topBook.装帧 && topBook.装帧 !== '暂无' && topBook.装帧.trim() && (
                      <div>
                        <span className="font-medium">装帧：</span>
                        <span>{topBook.装帧}</span>
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
              <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-green-600">书讯</h3>
              <Link to="/书讯" className="text-green-600 dark:text-green-400 hover:underline text-sm">
                更多 ›
              </Link>
            </div>
            <div className="space-y-2 flex-1 mt-2">
              {(data.书讯 || []).slice(1, 6).map(item => (
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 第二行：书库 */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b" style={{ borderColor: '#fd7e14' }}>
            <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-green-600">书库</h3>
            <Link to="/书库" className="text-green-600 dark:text-green-400 hover:underline text-sm">
              更多 ›
            </Link>
          </div>
          <BookCarousel books={data.书库 || []} itemsPerSlide={5} />
        </div>
      </div>

      {/* 第三行：两列布局 - 左列70%，右列30% */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左列：书评、观点横向并排，问答，译林、文艺横向并排 */}
        <div className="w-full lg:w-[70%] space-y-6">
          {/* 书评、观点横向并排 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryBlock 
              data={data['书评']}
              title="书评"
              link="/书评"
              authorField="作者"
            />
            <CategoryBlock 
              data={data['观点']}
              title="观点"
              link="/观点"
              authorField="作者"
            />
          </div>

          {/* 问答 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center mb-0 pb-2 -mx-4 px-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-green-600">近期问答</h3>
              <div className="flex items-center gap-3">
                <Link to="/问答" className="text-green-600 dark:text-green-400 hover:underline text-sm">
                  提问
                </Link>
                <Link to="/问答" className="text-green-600 dark:text-green-400 hover:underline text-sm">
                  更多 ›
                </Link>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {(data.qa || []).slice(0, 3).map(item => (
                <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                  <Link 
                    to="/问答"
                    className="block hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2"
                  >
                    {item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content}
                  </Link>
                </div>
              ))}
              {(!data.qa || data.qa.length === 0) && (
                <div className="text-gray-500 dark:text-gray-400 py-3 text-center">暂无问答</div>
              )}
            </div>
          </div>

          {/* 译林、文艺横向并排 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryBlock 
              data={data['译林']}
              title="译林"
              link="/译林"
              authorField="原文作者"
            />
            <CategoryBlock 
              data={data['文艺']}
              title="文艺"
              link="/文艺"
              authorField="作者"
            />
          </div>
        </div>

        {/* 右列：通讯、文史上下排列 */}
        <div className="w-full lg:w-[30%] flex flex-col space-y-6">
          <CategoryBlock 
            data={data['通讯']}
            title="通讯"
            link="/通讯"
            authorField="作者"
            hideFirst={false}
            itemCount={7}
          />
          <CategoryBlock 
            data={data['文史']}
            title="文史"
            link="/文史"
            authorField="作者"
            hideFirst={false}
            itemCount={7}
          />
        </div>
      </div>
    </div>
  )
}

function CategoryBlock({ data = [], title, link, authorField, hideFirst = false, itemCount = 5 }) {
  // 获取作者信息，对于译林优先显示原文作者，如果没有则显示作者
  const getAuthor = (item) => {
    if (title === '译林') {
      return item.原文作者 || item.作者 || ''
    }
    return item[authorField] || ''
  }

  if (!data.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col h-full">
        <div className="flex justify-between items-center mb-0 pb-2 -mx-3 px-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold relative pl-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-green-600">{title}</h3>
          <Link to={link} className="text-green-600 dark:text-green-400 hover:underline text-sm">
            更多 ›
          </Link>
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
        <h3 className="text-lg font-bold">{title}</h3>
        <Link to={link} className="text-green-600 dark:text-green-400 hover:underline text-sm">
          更多 ›
        </Link>
      </div>
      <div className="space-y-2 flex-1 mt-2">
        {!hideFirst && first && (
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <Link 
              to={`${link}/${first.id}`}
              className="block font-semibold hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2 mb-1"
            >
              {first.标题}
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
              {stripHTML(first.内容).slice(0, 120)}
            </p>
            {getAuthor(first) && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getAuthor(first)}
              </div>
            )}
          </div>
        )}
        {listItems.slice(0, displayCount).map(item => (
          <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-1.5 last:border-0">
            <Link 
              to={`${link}/${item.id}`}
              className="block hover:text-green-600 dark:hover:text-green-400 transition-colors line-clamp-2 text-sm"
            >
              {item.标题}
            </Link>
            {getAuthor(item) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getAuthor(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
