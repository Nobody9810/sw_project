import React, { useState, useEffect } from 'react'
import { Card, Avatar, Form, Button, Input, message, Spin, Empty, Space, Typography, Divider, Alert } from 'antd'
import { SendOutlined, UserOutlined, ClockCircleOutlined, MessageOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { commentApiClient } from '../utils/apiClient'

const { TextArea } = Input
const { Text, Title } = Typography

interface CommentData {
  id: number
  user_name: string
  comment: string
  submit_date: string
  level: number
  parent_id: number | null
  replies: CommentData[]
}

interface CommentSectionProps {
  appLabel: string
  modelName: string
  objectId: number
}

const CommentSection: React.FC<CommentSectionProps> = ({ appLabel, modelName, objectId }) => {
  const [comments, setComments] = useState<CommentData[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [comment, setComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showReviewAlert, setShowReviewAlert] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return document.body.classList.contains('dark-theme')
  })

  useEffect(() => {
    fetchComments()
  }, [appLabel, modelName, objectId, refreshKey])

  // 从localStorage恢复用户信息
  useEffect(() => {
    const savedName = localStorage.getItem('comment_name')
    const savedEmail = localStorage.getItem('comment_email')
    if (savedName) setName(savedName)
    if (savedEmail) setEmail(savedEmail)
  }, [])

  // 监听主题变化
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.body.classList.contains('dark-theme'))
    }
    
    // 初始检查
    checkTheme()
    
    // 监听主题变化事件
    const handleThemeChange = () => {
      checkTheme()
    }
    
    document.addEventListener('themeChange', handleThemeChange)
    
    // 使用MutationObserver监听body类变化
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => {
      document.removeEventListener('themeChange', handleThemeChange)
      observer.disconnect()
    }
  }, [])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const url = `/comment/api/${encodeURIComponent(appLabel)}/${encodeURIComponent(modelName)}/${objectId}/`
      const response = await commentApiClient.get(url)
      setComments(response.data.comments || [])
    } catch (err: any) {
      console.error('获取评论失败:', err)
      message.error('加载评论失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      message.warning('请输入您的称呼')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.warning('请输入有效的邮箱地址')
      return
    }
    if (!comment.trim()) {
      message.warning('请输入评论内容')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('email', email.trim())
      formData.append('comment', comment.trim())
      if (replyingTo) {
        formData.append('reply_to', replyingTo.id.toString())
      }

      localStorage.setItem('comment_name', name.trim())
      localStorage.setItem('comment_email', email.trim())

      const url = `/comment/create/${encodeURIComponent(appLabel)}/${encodeURIComponent(modelName)}/${objectId}/`
      await commentApiClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      message.success({
        content: '评论提交成功！',
        duration: 2,
      })
      setComment('')
      setReplyingTo(null)
      setShowReviewAlert(true)
      // 5秒后自动隐藏提醒
      setTimeout(() => {
        setShowReviewAlert(false)
      }, 5000)
      // 不刷新评论列表，因为审核中的评论不会显示
    } catch (err: any) {
      console.error('提交评论失败:', err)
      const errorMsg = err.response?.data?.error || err.response?.data?.errors || '提交失败，请稍后重试'
      message.error(typeof errorMsg === 'string' ? errorMsg : '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } else if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小时前`
    } else if (minutes > 0) {
      return `${minutes}分钟前`
    } else {
      return '刚刚'
    }
  }

  const getAvatarColor = (name: string) => {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const renderComment = (comment: CommentData, level: number = 0) => {
    return (
      <div key={comment.id} style={{ marginLeft: level > 0 ? 24 : 0, marginBottom: 16 }}>
        <Card
          size="small"
          style={{
            borderLeft: level > 0 ? (isDark ? '3px solid #1a3a5a' : '3px solid #e6f7ff') : 'none',
            backgroundColor: level > 0 ? (isDark ? '#2a2a2a' : '#fafafa') : (isDark ? '#242424' : '#fff'),
            borderRadius: '8px',
            boxShadow: level > 0 ? 'none' : (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'),
          }}
        >
          <Space align="start" style={{ width: '100%' }}>
            <Avatar
              size={48}
              style={{ 
                backgroundColor: getAvatarColor(comment.user_name), 
                flexShrink: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#fff',
              }}
            >
              {comment.user_name.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Space>
                <Text strong>{comment.user_name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {formatDate(comment.submit_date)}
                </Text>
              </Space>
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{comment.comment}</Text>
              </div>
              {level < 3 && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setReplyingTo({ id: comment.id, name: comment.user_name })
                    setTimeout(() => {
                      document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 100)
                  }}
                >
                  回复
                </Button>
              )}
              {comment.replies && comment.replies.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {comment.replies.map((reply) => renderComment(reply, level + 1))}
                </div>
              )}
            </div>
          </Space>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  const totalComments = comments.reduce((acc, c) => acc + 1 + countReplies(c), 0)

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <MessageOutlined style={{ marginRight: 8 }} />
          评论 ({totalComments})
        </Title>
      </div>

      <div id="comment-form" style={{ marginBottom: 32 }}>
        {showReviewAlert && (
          <Alert
            message="评论已提交"
            description="您的评论正在审核中，审核通过后将显示在评论列表中。感谢您的参与！"
            type="info"
            icon={<CheckCircleOutlined />}
            closable
            onClose={() => setShowReviewAlert(false)}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        <Card>
          {replyingTo && (
            <div style={{ 
              marginBottom: 16, 
              padding: 12, 
              background: isDark ? '#1a3a5a' : '#e6f7ff', 
              borderRadius: 6,
              border: isDark ? '1px solid #333' : 'none'
            }}>
              <Space>
                <Text style={{ color: isDark ? '#e0e0e0' : undefined }}>正在回复: <Text strong>{replyingTo.name}</Text></Text>
                <Button type="link" size="small" onClick={() => setReplyingTo(null)}>
                  取消
                </Button>
              </Space>
            </div>
          )}
          <Form layout="vertical">
            <Form.Item>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <Input
                  placeholder="您的称呼"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ 
                    flex: 1,
                    height: '44px',
                    borderRadius: '8px',
                    border: '1px solid #d9d9d9',
                    fontSize: '15px',
                    padding: '8px 16px',
                    transition: 'all 0.3s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1890ff'
                    e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d9d9d9'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
                <Input
                  type="email"
                  placeholder="您的邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    flex: 1,
                    height: '44px',
                    borderRadius: '8px',
                    border: '1px solid #d9d9d9',
                    fontSize: '15px',
                    padding: '8px 16px',
                    transition: 'all 0.3s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1890ff'
                    e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d9d9d9'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
              </div>
            </Form.Item>
            <Form.Item>
              <TextArea
                rows={5}
                onChange={(e) => setComment(e.target.value)}
                value={comment}
                placeholder="写下您的评论..."
                maxLength={3000}
                showCount
                style={{
                  borderRadius: '8px',
                  border: '1px solid #d9d9d9',
                  fontSize: '15px',
                  padding: '12px 16px',
                  lineHeight: 1.6,
                  transition: 'all 0.3s',
                  resize: 'vertical',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1890ff'
                  e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d9d9d9'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                loading={submitting}
                onClick={handleSubmit}
                icon={<SendOutlined />}
              >
                发表评论
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>

      <Divider />

      <div>
        {comments.length === 0 ? (
          <Empty
            description="暂无评论，快来发表第一条评论吧！"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  )
}

function countReplies(comment: CommentData): number {
  return comment.replies.reduce((acc, reply) => acc + 1 + countReplies(reply), 0)
}

export default CommentSection
