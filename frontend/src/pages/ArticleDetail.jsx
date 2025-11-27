import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import apiClient, { interactionsApiClient } from '../utils/apiClient'
import RelatedSidebar from '../components/Sidebar/RelatedSidebar'
import LikeDislike from '../components/LikeDislike'
import CommentSection from '../components/CommentSection'
import ShareButtons from '../components/ShareButtons'
import DFlipViewer from '../components/DFlipViewer'

function ArticleDetail({ type }) {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  const formatDate = (value) => {
    if (!value) {
      return null
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return null
    }
    return parsed.toLocaleDateString('zh-CN')
  }

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get(`/${type}/${id}/`)
        setArticle(response.data)
        // 调试：检查PDF文档URL
        if (response.data.文档) {
          console.log('PDF文档URL:', response.data.文档)
        }
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
        icon: 'bi-calendar3',
        label: formatDate(article.更新时间),
      },
      {
        icon: 'bi-person',
        label: article.作者 || null,
      },
      {
        icon: 'bi-building',
        label: article.出处 || null,
      },
      {
        icon: 'bi-eye',
        label: article.总浏览量 != null ? `总浏览: ${article.总浏览量}` : null,
      },
      {
        icon: 'bi-eye-fill',
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
    const sections = [
      { key: '内容简介', title: '内容简介', icon: 'bi-book' },
      { key: '内容', title: '内容简介', icon: 'bi-journal-text' },
      { key: '作者简介', title: '作者简介', icon: 'bi-person-badge' },
      { key: '目录', title: '目录', icon: 'bi-list-ul' },
      { key: '前言', title: '前言', icon: 'bi-chat-quote' },
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
      <div className="container sx-container" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="py-5 text-center text-muted">加载中...</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container sx-container" style={{ 
        minHeight: 'calc(100vh - 500px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: '1 0 auto',
        width: '100%'
      }}>
        <div className="py-5 text-center text-danger">文章不存在或已下架</div>
      </div>
    )
  }

  return (
    <div className="container sx-container">
      <div className="row">
        <div className="col-lg-8">
          <article className="sx-article">
            <h1 className="sx-title">{article.标题}</h1>

            <div className="sx-meta">
              {metaItems.length > 0 && (
                <>
                  {metaItems.map(item => (
                    <div className="sx-meta-item" key={item.label}>
                      <i className={`bi ${item.icon}`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </>
              )}
              <ShareButtons 
                title={article.标题}
                description={article.内容简介 || (article.内容 ? article.内容.substring(0, 100).replace(/<[^>]*>/g, '') : '')}
              />
            </div>

            {/* 书讯信息卡片 */}
            {type === "书讯" && (article.图片 || bookInfo.length > 0) && (
              <div className="sx-book-info-card">
                <div className="sx-book-info-content">
                  {article.图片 && (

                      <img 
                      src={article.图片 || '/static/images/default-placeholder.png'} 
                      alt={article.标题}
                      className="feature-img"
                      loading="lazy"
                      style={{ width: '30%', height: 'auto', display: 'block' }} />

                  )}
                  <div className="sx-book-details">
                    {bookInfo.map((info, index) => (
                      <div className="sx-book-detail-item" key={index}>
                        <span className="sx-book-detail-label">{info.label}：</span>
                        <span className="sx-book-detail-value">{info.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {richSections.map(section => (
              <div className="sx-section" key={section.key}>
                <div className="sx-section-header">
                  <div className="d-flex align-items-center">
                    <div className="sx-section-icon">
                      <i className={`bi ${section.icon}`} aria-hidden="true" />
                    </div>
                    <h3 className="sx-section-title">{section.title}</h3>
                  </div>
                </div>
                <div
                  className="sx-section-content text-justify"
                  dangerouslySetInnerHTML={{ __html: section.value }}
                />
              </div>
            ))}

            {!richSections.length && article.内容 && (
              <div className="sx-section">
                <div className="sx-section-content text-justify" dangerouslySetInnerHTML={{ __html: article.内容 }} />
              </div>
            )}

            {article.文档 && (
              <div className="sx-section">
                <div className="sx-section-header">
                  <div className="d-flex align-items-center">
                    <div className="sx-section-icon">
                      <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                    </div>
                    <h3 className="sx-section-title">在线阅读</h3>
                  </div>
                </div>
                <div className="sx-section-content">
                  <DFlipViewer fileUrl={article.文档} />
                </div>
              </div>
            )}

            <div className="sx-comments">
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

        <div className="col-lg-4">
          <RelatedSidebar type={type} currentId={id} sectionName={type} />
        </div>
      </div>
    </div>
  )
}

export default ArticleDetail

