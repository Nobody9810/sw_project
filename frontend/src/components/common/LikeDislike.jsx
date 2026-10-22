import React, { useEffect, useRef, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { interactionsApiClient } from '@/lib/apiClient'
import { requestErrorMessage } from '@/lib/requestError'
import { useAuth } from '@/features/auth/AuthContext'

function LikeDislike({
  appLabel = 'home',
  modelName,
  itemId,
  initialLikes = 0,
  initialDislikes = 0,
}) {
  const { user, loading: authLoading } = useAuth()
  const [reaction, setReaction] = useState(null)
  const [statusIdentity, setStatusIdentity] = useState(null)
  const [statusError, setStatusError] = useState('')
  const [statusAttempt, setStatusAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const pendingRef = useRef(false)
  const requestRef = useRef(null)
  const resource = `${appLabel}/${modelName}/${itemId}`
  const identity = `${resource}:${user?.id ?? 'guest'}`
  const checking = authLoading || statusIdentity !== identity
  const blocked = submitting || checking
  const likes = reaction?.identity === identity ? reaction.likes : initialLikes
  const dislikes = reaction?.identity === identity ? reaction.dislikes : initialDislikes
  const status = reaction?.identity === identity ? reaction.status : {
    isLiked: false,
    isDisliked: false,
  }

  useEffect(() => {
    setReaction(null)
    setSubmitting(false)
    setError('')
    setStatusError('')
    pendingRef.current = false
    if (authLoading) return
    const controller = new AbortController()
    requestRef.current = controller
    const loadStatus = async () => {
      try {
        const response = await interactionsApiClient.get(`/interactions/api/reaction/${resource}/`, { signal: controller.signal })
        if (controller.signal.aborted) return
        const data = response.data
        if (!data.success) throw new Error('读取失败')
        setReaction({ identity, likes: data.total_likes, dislikes: data.total_dislikes,
          status: { isLiked: data.is_liked, isDisliked: data.is_disliked } })
        setStatusIdentity(identity)
      } catch (requestError) {
        if (!controller.signal.aborted) setStatusError(requestErrorMessage(requestError, '点赞状态加载失败，请重试'))
      }
    }
    void loadStatus()
    return () => { controller.abort(); requestRef.current?.abort() }
  }, [identity, resource, authLoading, statusAttempt])

  const triggerReaction = async (action) => {
    if (!modelName || !itemId || blocked || pendingRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    pendingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      const response = await interactionsApiClient.post(
        `/interactions/api/${action}/${appLabel}/${modelName}/${itemId}/`,
        {}, { signal: controller.signal },
      )
      if (controller.signal.aborted) return
      const data = response.data
      if (!data.success) throw new Error('更新失败，请重试')
      setReaction({ identity, likes: data.total_likes, dislikes: data.total_dislikes,
        status: { isLiked: data.is_liked, isDisliked: data.is_disliked } })
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestErrorMessage(requestError, '点赞提交失败，请重试'))
    } finally {
      if (!controller.signal.aborted) {
        pendingRef.current = false
        setSubmitting(false)
      }
    }
  }

  return (
    <div aria-busy={submitting || (checking && !statusError)} className="flex flex-wrap gap-3 items-center my-4">
      {submitting && <span role="status" className="sr-only">正在提交，请稍候…</span>}
      {/* 点赞按钮 */}
      <button
        type="button"
        onClick={() => triggerReaction('like')}
        disabled={blocked}
        aria-label={status.isLiked ? '取消点赞' : '点赞'}
        aria-pressed={status.isLiked}
        className={`
          inline-flex items-center px-4 py-2 rounded-full
          border-2 transition-all duration-300 ease-out
          font-medium text-sm md:text-base
          shadow-sm
          ${status.isLiked
            ? 'text-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400'
            : 'text-gray-700 dark:text-night-300 border-gray-300 dark:border-night-600 bg-white dark:bg-night-800'
          }
          ${blocked
            ? 'opacity-70 cursor-not-allowed'
            : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer'
          }
          ${!blocked && !status.isLiked
            ? 'hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400'
            : ''
          }
        `}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <ThumbsUp 
            className={`w-5 h-5 md:w-6 md:h-6 transition-transform duration-300 ${
              !submitting ? 'hover:scale-125' : ''
            }`}
            aria-hidden="true"
          />
          <span 
            className={`min-w-[24px] text-center font-semibold transition-all duration-300 ${
              ''
            }`}
          >
            {likes}
          </span>
        </div>
      </button>

      {/* 点踩按钮 */}
      <button
        type="button"
        onClick={() => triggerReaction('dislike')}
        disabled={blocked}
        aria-label={status.isDisliked ? '取消点踩' : '点踩'}
        aria-pressed={status.isDisliked}
        className={`
          inline-flex items-center px-4 py-2 rounded-full
          border-2 transition-all duration-300 ease-out
          font-medium text-sm md:text-base
          shadow-sm
          ${status.isDisliked
            ? 'text-red-500 border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-500 dark:text-red-400'
            : 'text-gray-700 dark:text-night-300 border-gray-300 dark:border-night-600 bg-white dark:bg-night-800'
          }
          ${blocked
            ? 'opacity-70 cursor-not-allowed'
            : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer'
          }
          ${!blocked && !status.isDisliked
            ? 'hover:border-red-400 hover:text-red-500 dark:hover:border-red-500 dark:hover:text-red-400'
            : ''
          }
        `}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <ThumbsDown 
            className={`w-5 h-5 md:w-6 md:h-6 transition-transform duration-300 ${
              !submitting ? 'hover:scale-125' : ''
            }`}
            aria-hidden="true"
          />
          <span 
            className={`min-w-[24px] text-center font-semibold transition-all duration-300 ${
              ''
            }`}
          >
            {dislikes}
          </span>
        </div>
      </button>
      {checking && !statusError && <span role="status" className="sr-only">正在同步点赞状态…</span>}
      {statusError && <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">{statusError}<button type="button" onClick={() => setStatusAttempt(value => value + 1)} className="ml-2 min-h-11 underline">重试</button></p>}
      {error && <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default LikeDislike
