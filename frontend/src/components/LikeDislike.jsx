import React, { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { interactionsApiClient } from '../utils/apiClient'

function LikeDislike({
  appLabel = 'home',
  modelName,
  itemId,
  initialLikes = 0,
  initialDislikes = 0,
  initialStatus = { is_liked: false, is_disliked: false },
}) {
  const [likes, setLikes] = useState(initialLikes)
  const [dislikes, setDislikes] = useState(initialDislikes)
  const [status, setStatus] = useState({
    isLiked: initialStatus.is_liked || initialStatus.isLiked || false,
    isDisliked: initialStatus.is_disliked || initialStatus.isDisliked || false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [likesAnimating, setLikesAnimating] = useState(false)
  const [dislikesAnimating, setDislikesAnimating] = useState(false)

  const triggerReaction = async (action) => {
    if (!modelName || !itemId || submitting) {
      return
    }
    setSubmitting(true)
    try {
      // 使用新的 interactions app 的 API 端点
      const response = await interactionsApiClient.post(`/interactions/api/${action}/${appLabel}/${modelName}/${itemId}/`, {})
      const data = response.data
      
      // 触发计数动画
      if (action === 'like') {
        setLikesAnimating(true)
        setTimeout(() => setLikesAnimating(false), 300)
      } else {
        setDislikesAnimating(true)
        setTimeout(() => setDislikesAnimating(false), 300)
      }
      
      setLikes(data.total_likes ?? likes)
      setDislikes(data.total_dislikes ?? dislikes)
      setStatus({
        isLiked: data.is_liked,
        isDisliked: data.is_disliked,
      })
    } catch (error) {
      console.error('更新点赞状态失败', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex gap-3 items-center my-4">
      {/* 点赞按钮 */}
      <button
        type="button"
        onClick={() => triggerReaction('like')}
        disabled={submitting}
        className={`
          inline-flex items-center px-4 py-2 rounded-full
          border-2 transition-all duration-300 ease-out
          font-medium text-sm md:text-base
          shadow-sm
          ${status.isLiked
            ? 'text-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400'
            : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }
          ${submitting
            ? 'opacity-70 cursor-not-allowed'
            : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer'
          }
          ${!submitting && !status.isLiked
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
              likesAnimating ? 'animate-pulse scale-125' : ''
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
        disabled={submitting}
        className={`
          inline-flex items-center px-4 py-2 rounded-full
          border-2 transition-all duration-300 ease-out
          font-medium text-sm md:text-base
          shadow-sm
          ${status.isDisliked
            ? 'text-red-500 border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-500 dark:text-red-400'
            : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }
          ${submitting
            ? 'opacity-70 cursor-not-allowed'
            : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer'
          }
          ${!submitting && !status.isDisliked
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
              dislikesAnimating ? 'animate-pulse scale-125' : ''
            }`}
          >
            {dislikes}
          </span>
        </div>
      </button>
    </div>
  )
}

export default LikeDislike
