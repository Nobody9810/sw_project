
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, User, Building, Eye, TrendingUp, Book, UserCircle, List, MessageSquare, FileText } from 'lucide-react'
import apiClient, { interactionsApiClient } from '../utils/apiClient'
import { formatDateToChinese } from '../utils/dateFormatter'
import RelatedSidebar from '../components/Sidebar/RelatedSidebar'
import BookReviewCategorySidebar from '../components/Sidebar/BookReviewCategorySidebar'
import LikeDislike from '../components/LikeDislike'
import CommentSection from '../components/CommentSection'
import ShareButtons from '../components/ShareButtons'
import DFlipViewer from '../components/DFlipViewer'
import PriceModal from '../components/PriceModal'

function ArticleDetail({ type }) {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const formatDate = (value) => {
    if (!value) {
      return null
    }
    return formatDateToChinese(value)
  }

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get(`/${type}/${id}/`)
        setArticle(response.data)
      } catch (error) {
        console.error('获取文章详情失败:', error)
        setArticle(null)
      } finally {
        setLoading(false)
      }
    }
    if (id) {
      fetchArticle()
    }
  }, [type, id])

  // 使用 ref 跟踪是否已经更新过浏览量，避免重复调用
  const viewCountUpdated = useRef(false)

  // 更新浏览量（使用防刷策略：30分钟内同一Session只算一次）
  useEffect(() => {
    const updateViewCount = async () => {
      // 如果已经更新过，或者文章未加载，则跳过
      if (viewCountUpdated.current || !article || !id) return

      try {
        const appLabel = article.app_label || 'home'
        const modelName = article.model_name || type
        const response = await interactionsApiClient.post(
          `/interactions/api/view/${appLabel}/${modelName}/${id}/`,
          {}
        )

        // 标记为已更新
        viewCountUpdated.current = true

        // 无论是否计算浏览量，都更新显示的数据（后端总是返回当前浏览量）
        if (response.data.success) {
          setArticle(prev => ({
            ...prev,
            总浏览量: response.data.total_views,
            今日浏览量: response.data.today_views,
          }))
        }
      } catch (error) {
        // 静默失败，不影响用户体验
        console.debug('更新浏览量失败:', error)
      }
    }

    // 文章加载完成后更新浏览量（只调用一次）
    if (article && id) {
      updateViewCount()
    }
  }, [article, id, type])

  // 当 id 或 type 改变时，重置标记（切换文章时）
  useEffect(() => {
    viewCountUpdated.current = false
  }, [id, type])

  const metaItems = useMemo(() => {
    if (!article) {
      return []
    }
    return [
      {
        icon: Calendar,
        label: formatDate(article.更新时间),
      },
      {
        icon: User,
        label: article.作者 || null,
      },
      {
        icon: Building,
        label: article.出处 || null,
      },
      {
        icon: Eye,
        label: article.总浏览量 != null ? `总浏览: ${article.总浏览量}` : null,
      },
      {
        icon: TrendingUp,
        label: article.今日浏览量 != null ? `今日: ${article.今日浏览量}` : null,
      },
    ].filter(item => item.label)
  }, [article])

  const bookInfo = useMemo(() => {
    if (!article) {
      return []
    }
    return [
      { label: '作者', value: article.作者 },
      { label: '出版社', value: article.出版社 },
      { label: '出版年', value: article.出版年 ? new Date(article.出版年).getFullYear() : null },
      { label: '页数', value: article.页数 },
      { label: '定价', value: article.定价 },
      { label: '装帧', value: article.装帧 },
      { label: 'ISBN', value: article.ISBN },
    ].filter(item => item.value)
  }, [article])

  const richSections = useMemo(() => {
    if (!article) {
      return []
    }
    // 优先使用内容简介，如果存在内容简介则不显示内容字段，避免重复
    const hasContentIntro = article['内容']

    const sections = [
      {
        key: '内容',
        // 核心修改：判断类型，非书库/书讯则不给标题
        title: (type === '书库' || type === '书讯') ? '图书简介' : null,
        icon: Book
      },
      { key: '作者简介', title: '作者简介', icon: UserCircle },
      { key: '目录', title: '目录', icon: List },
      { key: '前言', title: '前言', icon: MessageSquare },
    ]
    return sections
      .map(section => ({
        ...section,
        value: article[section.key],
      }))
      .filter(section => section.value)
  }, [article])

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-500px)] flex items-center justify-center">
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-500px)] flex items-center justify-center">
        <div className="py-12 text-center text-red-500 dark:text-red-400">文章不存在或已下架</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-8">
          <article className="bg-transparent sm:bg-white sm:dark:bg-gray-800 rounded-none sm:rounded-xl shadow-none sm:shadow-lg border-none sm:border sm:border-gray-200 sm:dark:border-gray-700 p-4 sm:p-6 md:p-8 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {article.标题}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              {metaItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-4">
                  {metaItems.map(item => {
                    const IconComponent = item.icon
                    return (
                      <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <IconComponent className="w-4 h-4 text-gray-400" aria-hidden="true" />
                        <span>{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="ml-auto">
                <ShareButtons
                  title={article.标题}
                  description={article.内容 || (article.内容 ? article.内容.substring(0, 100).replace(/<[^>]*>/g, '') : '')}
                />
              </div>
            </div>

            {/* 书讯信息卡片 */}
            {type === "书讯" && (article.图片 || bookInfo.length > 0) && (
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-6 md:p-8 mb-8 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                  {article.图片 && (
                    <div className="flex-shrink-0 flex justify-center md:justify-start">
                      <div className="flex items-center">
                        <img
                          src={article.图片 || '/assets/images/default-placeholder.png'}
                          alt={article.标题}
                          className="w-40 sm:w-48 md:w-56 max-w-[240px] rounded-lg object-contain shadow-lg"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 space-y-3 flex flex-col justify-center">
                    {bookInfo.map((info, index) => (
                      <div key={index} className="flex gap-3 text-base md:text-lg">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">{info.label}：</span>
                        <span className="text-gray-600 dark:text-gray-400">{info.value}</span>
                      </div>
                    ))}

                    {/* 新增：有售卖信息时显示查看价格按钮 */}
                    {article.sale_info?.is_active && (
                      <button
                        onClick={() => setShowPriceModal(true)}
                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
                      >
                        购书咨询
                      </button>
                    )}

                  </div>
                </div>

                {showPriceModal && (
                  <PriceModal
                    saleInfo={article.sale_info}
                    articletitle={article.标题}

                    onClose={() => setShowPriceModal(false)}
                  />
                )}
              </div>
            )
            }


            {richSections.map((section) => (
              <section key={section.key} className="mb-10">
                {/* 核心修改：只有当 title 存在时才渲染标题头 */}
                {section.title && (
                  <div className="flex items-center gap-3 mb-3 ">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center shadow-sm">
                      <section.icon className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{section.title}</h3>
                  </div>
                )}


                <div
                  className="prose prose-lg prose-gray dark:prose-invert max-w-none text-justify leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-6 [&_img]:mx-auto [&_img]:block [&_img]:shadow-md [&_p]:mb-0 [&_p]:text-gray-700 [&_p]:dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: section.value }}
                />

              </section>
            ))}




            {!richSections.length && article.内容 && (
              <div className="prose prose-lg prose-gray dark:prose-invert max-w-none text-justify leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-6 [&_img]:mx-auto [&_img]:block [&_img]:shadow-md [&_p]:mb-0 [&_p]:text-gray-700 [&_p]:dark:text-gray-300">
                <div dangerouslySetInnerHTML={{ __html: article.内容 }} />
              </div>
            )}

            {article.文档 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center shadow-sm">
                    <FileText className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">在线阅读</h3>
                </div>
                <div className="mt-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <DFlipViewer fileUrl={article.文档} />
                </div>
              </div>
            )}

            <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
              <LikeDislike
                appLabel={article.app_label || 'home'}
                modelName={article.model_name || type}
                itemId={article.id}
                initialLikes={article.likes || 0}
                initialDislikes={article.dislikes || 0}
                initialStatus={{
                  is_liked: article.is_liked,
                  is_disliked: article.is_disliked,
                }}
              />
            </div>
          </article>

          <CommentSection
            appLabel={article.app_label || 'home'}
            modelName={article.model_name || type}
            objectId={article.id}
          />
        </div>

        <div className="lg:col-span-4">
          {/* 书评分类 - 只在书评详情页显示 */}
          {type === '书评' && <BookReviewCategorySidebar />}
          <RelatedSidebar type={type} currentId={id} sectionName={type} />
        </div>
      </div>
    </div>
  )
}

export default ArticleDetail


