import { DETAIL_FRAME, DETAIL_CARD } from '@/lib/contentLayout'
import { detailSkeletonKind } from '@/lib/pageSkeleton'
import { usePageReady } from '@/components/common/PageLoadContext'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { articlePath } from '@/lib/articleUrl'
import { useParams } from '@/lib/navigation'
import { Calendar, User, Building, Eye, TrendingUp, Book, UserCircle, List, MessageSquare, FileText } from 'lucide-react'
import apiClient, { interactionsApiClient } from '@/lib/apiClient'
import { formatDateToChinese } from '@/lib/dateFormatter'
import MainSidebar from '@/components/content/Sidebar/MainSidebar'
import ContentWithSidebar from '@/components/common/ContentWithSidebar'
import LikeDislike from '@/components/common/LikeDislike'
import CommentSection from '@/features/comments/CommentSection'
import ShareButtons from '@/components/common/ShareButtons'
import DFlipViewer from '@/components/pdf/DFlipViewer'
import RequestError from '@/components/common/RequestError'
import { requestErrorMessage } from '@/lib/requestError'
import PriceModal from '@/components/common/PriceModal'
import BookDetailHeader from '@/components/content/BookDetailHeader'
import BookContentTabs from '@/components/content/BookContentTabs'
import LibraryDetailContent from '@/components/content/LibraryDetailContent'
import DocumentDetailContent from '@/components/content/DocumentDetailContent'
import LoadingState from '@/components/common/LoadingState'
import RichText from '@/components/content/RichText'
import ArticleReadingNavigation from '@/components/content/ArticleReadingNavigation'

function ArticleDetail({ type, initialArticle = null, initialError = '' }) {
  const isBookDetail = type === '书讯' || type === '书库'
  const isDocumentDetail = type === '古籍' || type === '论文'
  const { id } = useParams()
  const [article, setArticle] = useState(initialArticle)
  const hasArticle = useRef(Boolean(initialArticle))
  const [loading, setLoading] = useState(!initialArticle && !initialError)
  usePageReady(loading)
  const [error, setError] = useState(initialError)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const formatDate = (value) => {
    if (!value) {
      return null
    }
    return formatDateToChinese(value)
  }

  useEffect(() => {
    if (!id || (initialError && retryAttempt === 0 && !hasArticle.current)) return
    let active = true
    const controller = new AbortController()
    const hasInitial = initialArticle && String(initialArticle.id) === String(id)
    // A personalized refresh must not hide the server-rendered article.
    setLoading(!hasInitial && !hasArticle.current)
    setError('')
    setShowPriceModal(false)
    const fetchArticle = async () => {
      try {
        const response = await apiClient.get(`/${type}/${id}/`, { signal: controller.signal })
        if (!active) return
        const payload = response.data
        hasArticle.current = true
        setArticle(payload)
        setLoading(false)
        try {
          const counts = await interactionsApiClient.post(
            `/interactions/api/view/${payload.app_label || 'home'}/${payload.model_name || type}/${id}/`,
            {}, { signal: controller.signal },
          )
          if (active && counts.data.success) {
            setArticle(prev => prev?.id === payload.id ? {
              ...prev, 总浏览量: counts.data.total_views, 今日浏览量: counts.data.today_views,
            } : prev)
          }
        } catch (viewError) {
          if (active && viewError.code !== 'ERR_CANCELED') console.debug('浏览量更新失败')
        }
      } catch (requestError) {
        if (active && requestError.code !== 'ERR_CANCELED') setError(requestErrorMessage(requestError))
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchArticle()
    return () => { active = false; controller.abort() }
  }, [type, id, retryAttempt, initialArticle, initialError])

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
      { label: '出版日期', value: (article.出版年 || article.出版日期) ? formatDateToChinese(article.出版年 || article.出版日期) : null },
      { label: '页数', value: article.页数 },
      { label: '定价', value: article.定价 },
      { label: '装帧', value: article.装帧 },
      { label: 'ISBN', value: article.ISBN },
    ].filter(item => item.value != null && String(item.value).trim() && String(item.value).trim() !== '暂无')
  }, [article])

  const richSections = useMemo(() => {
    if (!article) {
      return []
    }
    // 优先使用内容简介，如果存在内容简介则不显示内容字段，避免重复

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
      .filter(section => {
        if (!section.value) return false
        if (type !== '书讯' && type !== '书库') return true
        const text = String(section.value).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
        return !['暂无', '暂无内容简介'].includes(text) && Boolean(text || /<(img|video|iframe)\b/i.test(section.value))
      })
  }, [article, type])

  if (loading) {
    return (
      <div className={DETAIL_FRAME}>
        <ContentWithSidebar wide={type !== '书库'} sidebar={<MainSidebar type={type} currentId={id} />}>
          <LoadingState kind={detailSkeletonKind(type)} label="正在加载文章…" />
        </ContentWithSidebar>
      </div>
    )
  }

  if (error && !article) return <RequestError message={error} onRetry={() => setRetryAttempt(value => value + 1)} />

  if (!article) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-500px)] flex items-center justify-center">
        <div className="py-12 text-center text-red-500 dark:text-red-400">文章不存在或已下架</div>
      </div>
    )
  }

  return (
    <>
    <Head>
      <title>{`${article.标题} — 書味`}</title>
    </Head>
    <div className={DETAIL_FRAME}>
      {error && <RequestError message={error} onRetry={() => setRetryAttempt(value => value + 1)} />}
      <ContentWithSidebar wide={type !== '书库'} sidebar={<MainSidebar type={type} currentId={id} />}>
          <article className={`${DETAIL_CARD} ${isBookDetail ? 'sm:shadow-sm' : 'sm:shadow-lg'}`}>
            {type === '书讯' ? (
              <BookDetailHeader article={article} bookInfo={bookInfo}
                metaItems={metaItems.filter(item => [Calendar, Eye, TrendingUp].includes(item.icon))}
                onPurchase={() => setShowPriceModal(true)} />
            ) : type === '书库' ? (
              <LibraryDetailContent key={article.id} article={article} sections={richSections}
                metaItems={metaItems.filter(item => [User, Calendar, Eye, TrendingUp].includes(item.icon))} />
            ) : isDocumentDetail ? (
              <DocumentDetailContent type={type} article={article} sections={richSections}
                metaItems={metaItems.filter(item => [User, Building, Calendar, Eye, TrendingUp].includes(item.icon))} />
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-night-100 mb-6 leading-tight">
                  {article.标题}
                </h1>

                <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-night-700">
                  {metaItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-4">
                      {metaItems.map(item => {
                        const IconComponent = item.icon
                        return (
                          <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600 dark:text-night-400">
                            <IconComponent className="w-4 h-4 text-gray-400" aria-hidden="true" />
                            <span>{item.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="ml-auto">
                    <ShareButtons
                      url={articlePath(type, article)}
                      article={article}
                      section={type}
                    />
                  </div>
                </div>
              </>
            )}

            {type === '书讯' && showPriceModal && (
              <PriceModal saleInfo={article.sale_info} articletitle={article.标题}
                onClose={() => setShowPriceModal(false)} />
            )}

            {type === '书讯' && <BookContentTabs key={article.id} sections={richSections} />}

            {!isBookDetail && !isDocumentDetail && richSections.map((section) => (
              <section key={section.key} className="mb-10">
                {/* 核心修改：只有当 title 存在时才渲染标题头 */}
                {section.title && (
                  <div className="flex items-center gap-3 mb-3 ">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-sage-900/30 dark:to-sage-800/30 flex items-center justify-center shadow-sm">
                      <section.icon className="w-6 h-6 text-green-600 dark:text-sage-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-night-100">{section.title}</h3>
                  </div>
                )}


                <RichText html={section.value} />

              </section>
            ))}




            {!isBookDetail && !isDocumentDetail && !richSections.length && article.内容 && (
              <RichText html={article.内容} />
            )}

            {type !== '书库' && !isDocumentDetail && article.文档 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-sage-900/30 dark:to-sage-800/30 flex items-center justify-center shadow-sm">
                    <FileText className="w-6 h-6 text-green-600 dark:text-sage-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-night-100">在线阅读</h3>
                </div>
                <div className="mt-6 rounded-lg overflow-hidden border border-gray-200 dark:border-night-700">
                  <DFlipViewer fileUrl={article.文档} />
                </div>
              </div>
            )}

            {/* 古籍/论文: one action row, reactions on the left and sharing on the right. */}
            <div className={isDocumentDetail ? 'flex flex-wrap items-center justify-between gap-3 pt-1'
              : article.previous_article || article.next_article ? 'mt-3 pt-5' : 'mt-10 pt-8'}>
              <LikeDislike
                appLabel={article.app_label || 'home'}
                modelName={article.model_name || type}
                itemId={article.id}
                initialLikes={article.likes || 0}
                initialDislikes={article.dislikes || 0}
              />
              {isDocumentDetail && <ShareButtons url={articlePath(type, article)} article={article} section={type} />}
            </div>
            <ArticleReadingNavigation type={type} previous={article.previous_article} next={article.next_article} />
          </article>

          <CommentSection
            appLabel={article.app_label || 'home'}
            modelName={article.model_name || type}
            objectId={article.id}
          />
      </ContentWithSidebar>
    </div>
    </>
  )
}

export default ArticleDetail


