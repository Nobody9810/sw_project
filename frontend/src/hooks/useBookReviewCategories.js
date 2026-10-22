import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'
import { requestErrorMessage } from '@/lib/requestError'

export default function useBookReviewCategories(enabled = true) {
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let mounted = true
    const controller = new AbortController()
    setLoadingCategories(true)
    setError('')

    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/book-review-categories/', { signal: controller.signal })
        
        if (mounted) {
          if (response.data) {
            // 处理不同的响应格式
            if (response.data.success && Array.isArray(response.data.categories)) {
              setCategories(response.data.categories)
            } else if (Array.isArray(response.data)) {
              setCategories(response.data)
            } else if (response.data.categories && Array.isArray(response.data.categories)) {
              setCategories(response.data.categories)
            } else {
              setCategories([])
            }
          } else {
            setCategories([])
          }
          setLoadingCategories(false)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('加载书评分类失败', error)
        if (mounted) {
          setError(requestErrorMessage(error))
          setLoadingCategories(false)
        }
      }
    }

    fetchCategories()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [attempt, enabled])

  return { categories, loadingCategories: enabled && loadingCategories, error, retry: () => setAttempt(value => value + 1) }
}
