import React, { useState } from 'react'
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

  const triggerReaction = async (action) => {
    if (!modelName || !itemId) {
      return
    }
    setSubmitting(true)
    try {
      // 使用新的 interactions app 的 API 端点
      const response = await interactionsApiClient.post(`/interactions/api/${action}/${appLabel}/${modelName}/${itemId}/`, {})
      const data = response.data
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
    <div className="like-dislike-container">
      <button
        type="button"
        className={`like-btn btn ${status.isLiked ? 'active' : ''}`}
        onClick={() => triggerReaction('like')}
        disabled={submitting}
      >
        <div className="btn-content">
          <i className="bi bi-hand-thumbs-up" aria-hidden="true" />
          <span className="count">{likes}</span>
        </div>
      </button>

      <button
        type="button"
        className={`dislike-btn btn ${status.isDisliked ? 'active' : ''}`}
        onClick={() => triggerReaction('dislike')}
        disabled={submitting}
      >
        <div className="btn-content">
          <i className="bi bi-hand-thumbs-down" aria-hidden="true" />
          <span className="count">{dislikes}</span>
        </div>
      </button>
    </div>
  )
}

export default LikeDislike


