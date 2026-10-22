import React, { useState, useEffect, useRef, useId } from 'react'
import { Send, Clock, MessageSquare, CircleCheck, Loader2, X } from 'lucide-react'
import { commentApiClient } from '@/lib/apiClient'
import { requestErrorMessage } from '@/lib/requestError'
import RequestError from '@/components/common/RequestError'
import Pagination from '@/components/common/Pagination'
import LoadingState from '@/components/common/LoadingState'
import Avatar from '@/features/auth/Avatar'
import { useAuth } from '@/features/auth/AuthContext'
import { useRouter } from 'next/router'
import { Link } from '@/lib/navigation'

const fieldClass = 'mt-2 block min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-night-700 dark:bg-night-900 dark:text-night-100 dark:placeholder:text-night-500'
const linkClass = 'inline-flex min-h-11 items-center rounded text-sm text-green-700 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sage-400 dark:hover:text-sage-300'

interface CommentData {
  id: number
  user_name: string
  avatar?: { type: 'image'; url: string } | { type: 'preset'; key: string } | null
  is_guest?: boolean | null
  comment: string
  submit_date: string
  level: number
  parent_id: number | null
  replies: CommentData[]
  reply_count: number
}

interface CommentSectionProps {
  appLabel: string
  modelName: string
  objectId: number
}

const CommentSection: React.FC<CommentSectionProps> = ({ appLabel, modelName, objectId }) => {
  const replyRequests = useRef(new Map<number, AbortController>())
  const [loadingReplies, setLoadingReplies] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [rootCount, setRootCount] = useState(0)
  const [totalComments, setTotalComments] = useState(0)
  const [repliesTruncated, setRepliesTruncated] = useState(false)
  const [comments, setComments] = useState<CommentData[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [comment, setComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [showReviewAlert, setShowReviewAlert] = useState(false)
  const [formError, setFormError] = useState('')
  const [replyErrors, setReplyErrors] = useState<Record<number, string>>({})
  const fieldId = useId()
  const commentInput = useRef<HTMLTextAreaElement | null>(null)
  const nicknameInput = useRef<HTMLInputElement | null>(null)
  const { user, loading: authLoading, refresh } = useAuth()
  const router = useRouter()
  const loginPath = `/登录?next=${encodeURIComponent(router.asPath.split('#')[0] + '#comment-form')}`
  const submission = useRef<AbortController | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    setLoadingReplies([])
    setReplyErrors({})
    const pendingReplies = replyRequests.current
    const load = async () => {
      try {
        const url = `/comment/api/${encodeURIComponent(appLabel)}/${encodeURIComponent(modelName)}/${objectId}/`
        const response = await commentApiClient.get(url, { params: { page, page_size: 10 }, signal: controller.signal })
        if (active) {
          setComments(response.data.comments || [])
          setRootCount(response.data.root_count ?? response.data.count ?? 0)
          setTotalComments(response.data.count || 0)
          setRepliesTruncated(Boolean(response.data.replies_truncated))
        }
      } catch (err) {
        if (active && !controller.signal.aborted) setLoadError(requestErrorMessage(err, '评论加载失败，请重试'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
      controller.abort()
      pendingReplies.forEach(request => request.abort())
      pendingReplies.clear()
    }
  }, [appLabel, modelName, objectId, refreshKey, page])

  useEffect(() => {
    // Remove the anonymous form's old cached personal data; identity now comes from Session.
    try {
      localStorage.removeItem('comment_name')
      localStorage.removeItem('comment_email')
    } catch { /* Storage is optional in private browsing. */ }
    return () => submission.current?.abort()
  }, [])

  const handleSubmit = async () => {
    if (authLoading || submission.current) return
    if (!user && !guestName.trim()) {
      setFormError('请填写昵称')
      nicknameInput.current?.focus()
      return
    }
    if (!comment.trim()) {
      setFormError('请输入评论内容')
      commentInput.current?.focus()
      return
    }

    const controller = new AbortController()
    submission.current = controller
    setSubmitting(true)
    setFormError('')
    setShowReviewAlert(false)

    try {
      const formData = new FormData()
      if (!user) formData.append('name', guestName.trim())
      formData.append('comment', comment.trim())
      if (replyingTo) {
        formData.append('reply_to', replyingTo.id.toString())
      }

      const url = `/comment/create/${encodeURIComponent(appLabel)}/${encodeURIComponent(modelName)}/${objectId}/`
      await commentApiClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      })
      if (controller.signal.aborted) return

      setComment('')
      setReplyingTo(null)
      setShowReviewAlert(true)
      // 不刷新评论列表，因为审核中的评论不会显示
    } catch (err: any) {
      if (controller.signal.aborted) return
      if (err.response?.status === 401 || (user && err.response?.data?.errors?.name)) void refresh()
      console.warn('提交评论失败')
      const fields = err.response?.data?.errors
      const errorMsg = fields && typeof fields === 'object'
        ? Object.values(fields).flat().filter(value => typeof value === 'string').join('；')
        : err.response?.data?.error || '提交失败，请稍后重试'
      setFormError(typeof errorMsg === 'string' && errorMsg ? errorMsg : '提交失败，请稍后重试')
    } finally {
      if (!controller.signal.aborted) { submission.current = null; setSubmitting(false) }
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
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}年${month}月${day}日`
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

  const loadMoreReplies = async (parent: CommentData) => {
    if (replyRequests.current.has(parent.id)) return
    const controller = new AbortController()
    replyRequests.current.set(parent.id, controller)
    setLoadingReplies(previous => [...previous, parent.id])
    setReplyErrors(previous => ({ ...previous, [parent.id]: '' }))
    try {
      const response = await commentApiClient.get(
        `/comment/api/${encodeURIComponent(appLabel)}/${encodeURIComponent(modelName)}/${objectId}/`,
        { params: { parent_id: parent.id, offset: parent.replies.length, page_size: 20 }, signal: controller.signal },
      )
      if (controller.signal.aborted) return
      const append = (items: CommentData[]): CommentData[] => items.map(item => {
        if (item.id === parent.id) {
          const merged = new Map(item.replies.map(reply => [reply.id, reply]))
          for (const reply of response.data.comments || []) merged.set(reply.id, reply)
          return { ...item, replies: [...merged.values()], reply_count: response.data.count }
        }
        return { ...item, replies: append(item.replies) }
      })
      setComments(append)
    } catch (error) {
      if (!controller.signal.aborted) setReplyErrors(previous => ({ ...previous, [parent.id]: requestErrorMessage(error, '回复加载失败，请重试') }))
    } finally {
      if (!controller.signal.aborted) {
        replyRequests.current.delete(parent.id)
        setLoadingReplies(previous => previous.filter(id => id !== parent.id))
      }
    }
  }

  const renderComment = (item: CommentData, level: number = 0): React.ReactNode => (
    <li key={item.id}>
      <article className={level > 0
        ? 'rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-night-700 dark:bg-night-900'
        : 'rounded-lg border border-gray-200 bg-white p-4 dark:border-night-700 dark:bg-night-800'}>
        <div className="flex items-start gap-3">
          <Avatar avatar={item.avatar} name={item.user_name} className="h-9 w-9 text-sm sm:h-12 sm:w-12 sm:text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="break-words text-sm font-semibold text-gray-900 dark:text-night-100">{item.user_name}</span>
              {item.is_guest === true && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-night-700 dark:text-night-400">访客</span>}
              <time dateTime={item.submit_date} className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-night-400">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(item.submit_date)}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700 dark:text-night-300">{item.comment}</p>
            {level < 3 && <button type="button" className={linkClass} onClick={() => {
              setReplyingTo({ id: item.id, name: item.user_name })
              document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              commentInput.current?.focus({ preventScroll: true })
            }}>回复</button>}
          </div>
        </div>
        {item.replies?.length > 0 && <ul aria-label={`${item.user_name}的回复`} className="mt-3 space-y-3 border-l-2 border-green-100 pl-2 dark:border-sage-800 sm:pl-4">
          {item.replies.map(reply => renderComment(reply, level + 1))}
        </ul>}
        {item.reply_count > item.replies.length && <button type="button" className={`${linkClass} mt-2 gap-2`}
          disabled={loadingReplies.includes(item.id)} aria-busy={loadingReplies.includes(item.id)}
          onClick={() => loadMoreReplies(item)}>
          {loadingReplies.includes(item.id) && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          加载更多回复
        </button>}
        {replyErrors[item.id] && <RequestError message={replyErrors[item.id]} onRetry={() => loadMoreReplies(item)} />}
      </article>
    </li>
  )

  return (
    <section aria-labelledby={`${fieldId}-heading`} className="mt-10">
      <h2 id={`${fieldId}-heading`} className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-night-100">
        <MessageSquare className="h-5 w-5" aria-hidden="true" />评论 ({totalComments})
      </h2>
      <div id="comment-form" className="mb-8 scroll-mt-24">
        {showReviewAlert && <div role="status" className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-sage-800 dark:bg-sage-950 dark:text-sage-300">
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">评论已提交</p>
            <p className="mt-1 leading-6">您的评论正在审核中，审核通过后将显示在评论列表中。感谢您的参与！</p>
          </div>
          <button type="button" aria-label="关闭提交提示" onClick={() => setShowReviewAlert(false)}
            className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:hover:bg-sage-900">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>}
        <form noValidate aria-label="发表评论" aria-busy={submitting} onSubmit={event => {
          event.preventDefault()
          return handleSubmit()
        }} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-night-700 dark:bg-night-800 sm:p-6">
          {authLoading ? <p className="text-sm text-gray-500 dark:text-night-400">正在确认账户信息，可先填写评论。</p> : !user && <p className="text-sm leading-6 text-gray-600 dark:text-night-300">
            可直接以访客身份评论，也可以{' '}
            <Link href={loginPath} className={linkClass}>登录或注册</Link>后使用固定昵称。
          </p>}
          {replyingTo && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-1 text-sm text-green-800 dark:bg-sage-950 dark:text-sage-300">
            <p className="min-w-0 break-words">正在回复：<span className="font-semibold">{replyingTo.name}</span></p>
            <button type="button" className={linkClass} onClick={() => setReplyingTo(null)}>取消回复</button>
          </div>}
          {user ? <p className="text-sm text-gray-600 dark:text-night-300">以“{user.nickname || '读者'}”发表评论 · 审核通过后公开</p> :
            <div>
              <label htmlFor={`${fieldId}-nickname`} className="text-sm text-gray-700 dark:text-night-200">昵称</label>
              <input id={`${fieldId}-nickname`} ref={nicknameInput} aria-label="昵称" value={guestName}
                onChange={event => setGuestName(event.target.value)} placeholder="填写昵称，无需邮箱"
                maxLength={50} required autoComplete="nickname" className={fieldClass} />
            </div>}
          <div>
            <label htmlFor={`${fieldId}-content`} className="text-sm text-gray-700 dark:text-night-200">评论内容</label>
            <textarea id={`${fieldId}-content`} ref={commentInput} rows={5} required maxLength={3000}
              aria-describedby={`${fieldId}-count`} placeholder="写下您的评论..." value={comment}
              onChange={event => setComment(event.target.value)} className={`${fieldClass} resize-y leading-7`} />
            <p id={`${fieldId}-count`} className="mt-2 text-right text-xs tabular-nums text-gray-500 dark:text-night-400">{comment.length} / 3000</p>
          </div>
          {formError && <RequestError message={formError} onRetry={undefined} />}
          <button type="submit" disabled={submitting || authLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sage-600 dark:hover:bg-sage-700 dark:focus-visible:ring-offset-night-800">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            <span>{submitting ? '正在提交…' : '发表评论'}</span>
          </button>
        </form>
      </div>
      <div className="border-t border-gray-200 pt-6 dark:border-night-700" aria-busy={loading}>
        {loadError && <RequestError message={loadError} onRetry={() => setRefreshKey(value => value + 1)} />}
        {loading ? <LoadingState label="正在加载评论…" count={2} /> : loadError ? null : comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-night-400">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-night-500" aria-hidden="true" />
            <p>暂无评论，快来发表第一条评论吧！</p>
          </div>
        ) : <ul aria-label="评论列表" className="space-y-4">{comments.map(item => renderComment(item))}</ul>}
      </div>
      {repliesTruncated && <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-night-400">回复较多，可点击对应评论的“加载更多回复”继续查看</p>}
      <Pagination page={page} totalPages={Math.ceil(rootCount / 10)} loading={loading} onPageChange={(nextPage: number) => {
        setLoading(true); setPage(nextPage)
      }} />
    </section>
  )
}

export default CommentSection
