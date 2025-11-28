import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import apiClient from '../../utils/apiClient'

function BookReviewCategorySidebar() {
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoadingCategories(true)

    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/book-review-categories/')
        
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
        console.error('加载书评分类失败', error)
        if (mounted) {
          setCategories([])
          setLoadingCategories(false)
        }
      }
    }

    fetchCategories()

    return () => {
      mounted = false
    }
  }, [])

  if (loadingCategories || categories.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden border border-transparent dark:border-gray-700">
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 relative">
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 m-0 pl-2.5 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-3.5 before:bg-green-600 before:rounded-sm flex items-center gap-2">
          <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
          书评分类
        </h4>
      </div>
      <div className="p-2">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Link
              key={category.id}
              to={`/书评/分类/${category.id}`}
              className="inline-block px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium text-xs border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              {category.名称}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BookReviewCategorySidebar

