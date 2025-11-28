import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Search, Instagram, Facebook, Mail, UserCircle, Moon, Sun, MessageSquare, X, Clock, History, Loader2, Filter, TrendingUp, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react'
import ClockComponent from './Clock'
import apiClient from '../utils/apiClient'
import { formatDateToChinese } from '../utils/dateFormatter'
import { useTheme } from '../hooks/useTheme'

function TopSearchBar() {
  const [keyword, setKeyword] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackData, setFeedbackData] = useState({ name: '', email: '', message: '' })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const { isDark: isDarkTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const searchAbortControllerRef = useRef(null)
  const resultItemRefs = useRef({})

  // 热门搜索词（可以从后端获取或基于搜索历史统计）
  const hotSearches = useMemo(() => {
    const historyCounts = {}
    searchHistory.forEach(term => {
      historyCounts[term] = (historyCounts[term] || 0) + 1
    })
    return Object.entries(historyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term)
  }, [searchHistory])

  // 搜索高亮函数
  const highlightText = useCallback((text, keyword) => {
    if (!text || !keyword) return text
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-orange-200 text-orange-900 font-medium px-0.5 rounded">
          {part}
        </mark>
      ) : part
    )
  }, [])

  // 按分类统计搜索结果
  const groupedResults = useMemo(() => {
    const grouped = {}
    const filtered = selectedCategory 
      ? searchResults.filter(item => item.type === selectedCategory)
      : searchResults
    
    filtered.forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = []
      }
      grouped[item.type].push(item)
    })
    return grouped
  }, [searchResults, selectedCategory])

  // 搜索结果统计
  const resultStats = useMemo(() => {
    const stats = {}
    searchResults.forEach(item => {
      stats[item.type] = (stats[item.type] || 0) + 1
    })
    return stats
  }, [searchResults])

  // 扁平化搜索结果用于键盘导航
  const flatResults = useMemo(() => {
    const results = []
    Object.entries(groupedResults).forEach(([type, items]) => {
      items.forEach(item => results.push({ ...item, _type: type }))
    })
    return results.slice(0, 8) // 最多显示8个结果
  }, [groupedResults])

  // 从 URL 参数初始化搜索关键词
  useEffect(() => {
    const urlKeyword = searchParams.get('keyword')
    if (urlKeyword) {
      setKeyword(decodeURIComponent(urlKeyword))
    }
  }, [searchParams])

  // 从 localStorage 加载搜索历史
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory')
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error('Failed to parse search history:', e)
      }
    }
  }, [])

  // 保存搜索历史
  const saveSearchHistory = useCallback((term) => {
    if (!term.trim()) return
    
    setSearchHistory(prevHistory => {
      const updatedHistory = [
        term.trim(),
        ...prevHistory.filter(item => item !== term.trim())
      ].slice(0, 10) // 最多保存10条
      
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
      return updatedHistory
    })
  }, [])

  // 处理搜索
  const handleSearch = useCallback((searchTerm = keyword) => {
    const trimmedTerm = searchTerm.trim()
    if (trimmedTerm) {
      saveSearchHistory(trimmedTerm)
      navigate(`/搜索?keyword=${encodeURIComponent(trimmedTerm)}`)
      setShowSuggestions(false)
      setSelectedIndex(-1)
      setSelectedCategory(null)
    }
  }, [keyword, navigate, saveSearchHistory])

  // 键盘导航处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showSuggestions) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => {
          const maxIndex = flatResults.length - 1
          return prev < maxIndex ? prev + 1 : prev
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
      } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
        e.preventDefault()
        const selectedItem = flatResults[selectedIndex]
        const searchTerm = selectedItem.标题 || keyword
        if (searchTerm.trim()) {
          saveSearchHistory(searchTerm.trim())
          navigate(`/搜索?keyword=${encodeURIComponent(searchTerm.trim())}`)
          setShowSuggestions(false)
          setSelectedIndex(-1)
          setSelectedCategory(null)
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    if (showSuggestions) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSuggestions, selectedIndex, flatResults, keyword, navigate, saveSearchHistory])

  // 滚动到选中的项目
  useEffect(() => {
    if (selectedIndex >= 0 && resultItemRefs.current[selectedIndex]) {
      resultItemRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedIndex])

  // 点击外部关闭建议框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
        setSelectedCategory(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 清理搜索请求
  useEffect(() => {
    return () => {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // 实时搜索API调用
  const performSearch = useCallback(async (searchTerm) => {
    // 取消之前的请求
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
    }

    // 创建新的 AbortController
    searchAbortControllerRef.current = new AbortController()

    try {
      setIsSearching(true)
      const response = await apiClient.get('/search/', {
        params: { keyword: searchTerm },
        signal: searchAbortControllerRef.current.signal,
      })
      
      const data = response.data || {}
      setSearchResults(data.results || [])
    } catch (error) {
      // 忽略取消的请求错误
      const isCanceled = 
        error.name === 'CanceledError' || 
        error.name === 'AbortError' ||
        error.code === 'ERR_CANCELED' ||
        error.message?.toLowerCase().includes('canceled') ||
        error.message?.toLowerCase().includes('aborted')
      
      if (!isCanceled) {
        console.error('搜索失败:', error)
        setSearchResults([])
      }
    } finally {
      setIsSearching(false)
    }
  }, [])

  // 防抖搜索建议 - 重构后的搜索逻辑
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    setKeyword(value)
    setSelectedIndex(-1)
    setSelectedCategory(null)

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 如果输入为空，隐藏建议并清空结果
    if (!value.trim()) {
      setShowSuggestions(false)
      setSearchResults([])
      return
    }

    // 设置新的定时器 - 防抖延迟
    debounceTimerRef.current = setTimeout(() => {
      // 显示建议框
      setShowSuggestions(true)
      // 执行实时搜索
      performSearch(value.trim())
    }, 400) // 400ms 防抖延迟
  }, [performSearch])

  // 处理表单提交
  const handleSubmit = (e) => {
    e.preventDefault()
    handleSearch()
  }

  // 选择历史记录
  const selectHistoryItem = (item) => {
    setKeyword(item)
    handleSearch(item)
  }

  // 清除搜索历史
  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('searchHistory')
  }

  // 选择热门搜索
  const selectHotSearch = (term) => {
    setKeyword(term)
    handleSearch(term)
  }

  // 清除分类筛选
  const clearCategoryFilter = () => {
    setSelectedCategory(null)
  }

  // 提交反馈
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    setIsSubmittingFeedback(true)
    setFeedbackSuccess(false)

    try {
      await apiClient.post('/feedback/', {
        name: feedbackData.name,
        email: feedbackData.email,
        message: feedbackData.message,
      })
      setFeedbackSuccess(true)
      setFeedbackData({ name: '', email: '', message: '' })
      setTimeout(() => {
        setShowFeedback(false)
        setFeedbackSuccess(false)
      }, 2000)
    } catch (error) {
      console.error('提交反馈失败:', error)
      alert('提交失败，请稍后重试')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  return (
    <>
      <div className="hidden md:block w-full bg-gray-800 py-1.5 border-b border-gray-700">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0">
          <ClockComponent />
          <div className="flex items-center gap-4">
            {/* 搜索表单 */}
            <div className="relative w-56 max-w-full" ref={suggestionsRef}>
              <form onSubmit={handleSubmit} className="relative">
                <input
                  ref={searchInputRef}
                  className="w-full h-10 py-2 pl-4 pr-12 border-none rounded-full bg-white text-gray-900 text-sm transition-all duration-300 shadow-md placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
                  type="search"
                  placeholder="搜索内容..."
                  name="keyword"
                  value={keyword}
                  onChange={handleInputChange}
                  onFocus={() => {
                    if (keyword.trim() || searchHistory.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  aria-label="Search"
                />
                <button
                  className="absolute right-1 top-1 w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 text-white border-none flex items-center justify-center transition-all duration-300 shadow-md hover:from-orange-500 hover:to-orange-600 hover:scale-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                  type="submit"
                  aria-label="搜索"
                >
                  <Search size={16} />
                </button>
              </form>

              {/* 搜索建议和历史 - 重构后的搜索逻辑 */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] max-h-[500px] overflow-y-auto">
                  {/* 搜索历史 */}
                  {!keyword.trim() && searchHistory.length > 0 && (
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center justify-between px-2 py-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <History size={14} />
                          <span>搜索历史</span>
                        </div>
                        <button
                          onClick={clearHistory}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          清除
                        </button>
                      </div>
                      <div className="mt-1">
                        {searchHistory.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => selectHistoryItem(item)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                          >
                            <Clock size={14} className="text-gray-400" />
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 热门搜索 */}
                  {!keyword.trim() && hotSearches.length > 0 && (
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500">
                        <TrendingUp size={14} />
                        <span>热门搜索</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {hotSearches.map((term, index) => (
                          <button
                            key={index}
                            onClick={() => selectHotSearch(term)}
                            className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 实时搜索结果 */}
                  {keyword.trim() && (
                    <div className="p-2">
                      {/* 搜索状态指示 */}
                      {isSearching && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 size={20} className="animate-spin text-orange-500" />
                          <span className="ml-2 text-sm text-gray-500">搜索中...</span>
                        </div>
                      )}

                      {/* 搜索结果统计和分类筛选 */}
                      {!isSearching && searchResults.length > 0 && (
                        <div className="mb-2 space-y-2">
                          <div className="flex items-center justify-between px-2">
                            <div className="text-xs text-gray-500">
                              找到 <span className="font-semibold text-orange-600">{searchResults.length}</span> 个结果
                            </div>
                            {selectedCategory && (
                              <button
                                onClick={clearCategoryFilter}
                                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                              >
                                <X size={12} />
                                清除筛选
                              </button>
                            )}
                          </div>
                          
                          {/* 分类筛选标签 */}
                          {Object.keys(resultStats).length > 1 && (
                            <div className="flex flex-wrap gap-1.5 px-2">
                              {Object.entries(resultStats).map(([type, count]) => (
                                <button
                                  key={type}
                                  onClick={() => setSelectedCategory(selectedCategory === type ? null : type)}
                                  className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                                    selectedCategory === type
                                      ? 'bg-orange-500 text-white shadow-md'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {type} ({count})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 搜索结果列表 - 按分类分组显示 */}
                      {!isSearching && Object.keys(groupedResults).length > 0 && (
                        <div className="space-y-3">
                          {Object.entries(groupedResults).map(([type, items]) => (
                            <div key={type} className="space-y-1">
                              {Object.keys(resultStats).length > 1 && (
                                <div className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded">
                                  {type} ({items.length})
                                </div>
                              )}
                              {items.slice(0, selectedCategory ? 8 : 3).map((item, index) => {
                                const flatIndex = flatResults.findIndex(r => r.id === item.id && r.type === item.type)
                                const isSelected = flatIndex === selectedIndex
                                return (
                                  <Link
                                    key={`${item.type}-${item.id}-${index}`}
                                    ref={el => {
                                      if (flatIndex >= 0) {
                                        resultItemRefs.current[flatIndex] = el
                                      }
                                    }}
                                    to={`/${item.type}/${item.id}`}
                                    onClick={() => {
                                      setShowSuggestions(false)
                                      saveSearchHistory(keyword)
                                    }}
                                    className={`block px-3 py-2.5 text-sm rounded transition-colors ${
                                      isSelected
                                        ? 'bg-orange-50 border-l-2 border-orange-500'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* 图片预览 */}
                                      {item.图片 && (
                                        <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100">
                                          <img
                                            src={item.图片}
                                            alt={item.标题}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.style.display = 'none'
                                            }}
                                          />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium line-clamp-1 mb-1">
                                          {highlightText(item.标题, keyword)}
                                        </div>
                                        {item.摘要 && (
                                          <div className="text-xs text-gray-500 line-clamp-2 mb-1.5">
                                            {highlightText(item.摘要, keyword)}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                            {item.type}
                                          </span>
                                          {item.更新时间 && (
                                            <span className="text-xs text-gray-400">
                                              {formatDateToChinese(item.更新时间)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                )
                              })}
                            </div>
                          ))}
                          
                          {/* 查看全部按钮 */}
                          {searchResults.length > flatResults.length && (
                            <button
                              onClick={() => handleSearch()}
                              className="w-full mt-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded transition-colors font-medium border border-orange-200"
                            >
                              查看全部 {searchResults.length} 个结果
                            </button>
                          )}
                        </div>
                      )}

                      {/* 无结果提示 */}
                      {!isSearching && searchResults.length === 0 && keyword.trim().length >= 2 && (
                        <div className="px-3 py-6 text-center">
                          <div className="text-gray-400 mb-2">
                            <Search size={32} className="mx-auto opacity-50" />
                          </div>
                          <p className="text-sm text-gray-500 mb-2">未找到相关结果</p>
                          <p className="text-xs text-gray-400 mb-3">试试其他关键词或检查拼写</p>
                          <button
                            onClick={() => handleSearch()}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                          >
                            仍然搜索 &quot;{keyword}&quot;
                          </button>
                        </div>
                      )}

                      {/* 默认搜索按钮（当输入字符少于2个时） */}
                      {keyword.trim().length < 2 && (
                        <button
                          onClick={() => handleSearch()}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                        >
                          <Search size={14} className="text-gray-400" />
                          搜索 &quot;{keyword}&quot;
                        </button>
                      )}

                      {/* 键盘导航提示 */}
                      {keyword.trim().length >= 2 && flatResults.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 px-2">
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <ArrowUp size={12} />
                              <ArrowDown size={12} />
                              <span>导航</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd>
                              <span>选择</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd>
                              <span>关闭</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 反馈按钮 */}
            <button
              onClick={() => setShowFeedback(true)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 text-white flex items-center justify-center transition-all duration-300 shadow-md hover:from-orange-500 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
              title="提出建议"
            >
              <MessageSquare size={20} />
            </button>

            {/* 社交图标 */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/shuwei_365/profilecard/?igsh=MTZ1N2lucXZiNzlsaQ%3D%3D"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 text-white flex items-center justify-center transition-all duration-300 shadow-md hover:from-orange-500 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                title="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61568664600545&mibextid=ZbWKwL"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 text-white flex items-center justify-center transition-all duration-300 shadow-md hover:from-orange-500 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                title="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={20} />
              </a>
              <div className="relative group">
                <a
                  href="mailto:shuwei506@gmail.com"
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 text-white flex items-center justify-center transition-all duration-300 shadow-md hover:from-orange-500 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                  title="邮箱"
                >
                  <Mail size={20} />
                </a>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white px-3 py-1.5 rounded-lg shadow-xl border border-gray-200 hidden group-hover:block z-50 whitespace-nowrap before:content-[''] before:absolute before:-top-1.5 before:left-1/2 before:-translate-x-1/2 before:rotate-45 before:w-3 before:h-3 before:bg-white before:border-l before:border-t before:border-gray-200">
                  <span className="text-xs text-gray-700">shuwei506@gmail.com</span>
                </div>
              </div>
            </div>

            {/* 功能图标 */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-600">
              <a
                href="/admin/"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-orange-500 text-white flex items-center justify-center transition-all duration-300 shadow-md hover:from-orange-500 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                title="管理员登录"
              >
                <UserCircle size={20} />
              </a>
              <button
                className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-orange-500 text-white flex items-center justify-center transition-all duration-300 shadow-md hover:from-orange-500 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-lg border-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                title={isDarkTheme ? "切换到浅色主题" : "切换到深色主题"}
                onClick={toggleTheme}
              >
                {isDarkTheme ? <Sun size={20} id="theme-icon" /> : <Moon size={20} id="theme-icon" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 反馈模态框 - 确保显示在最上层 */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">提出建议</h2>
              <button
                onClick={() => {
                  setShowFeedback(false)
                  setFeedbackSuccess(false)
                  setFeedbackData({ name: '', email: '', message: '' })
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
                aria-label="关闭"
              >
                <X size={24} />
              </button>
            </div>

            {feedbackSuccess ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">提交成功！</h3>
                <p className="text-gray-600">感谢您的反馈，我们会认真考虑您的建议。</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="p-6">
                <div className="mb-4">
                  <label htmlFor="feedback-name" className="block text-sm font-medium text-gray-700 mb-2">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="feedback-name"
                    type="text"
                    required
                    value={feedbackData.name}
                    onChange={(e) => setFeedbackData({ ...feedbackData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="请输入您的姓名"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="feedback-email" className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    required
                    value={feedbackData.email}
                    onChange={(e) => setFeedbackData({ ...feedbackData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="请输入您的邮箱"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                    建议内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    rows={6}
                    value={feedbackData.message}
                    onChange={(e) => setFeedbackData({ ...feedbackData, message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="请详细描述您的建议或意见..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeedback(false)
                      setFeedbackData({ name: '', email: '', message: '' })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="flex-1 px-4 py-2 bg-gradient-to-br from-orange-600 to-orange-500 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                  >
                    {isSubmittingFeedback ? '提交中...' : '提交'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default TopSearchBar

