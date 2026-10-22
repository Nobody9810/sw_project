import PrayerTopbar from '@/features/prayers/PrayerTopbar'
import AccountEntry from '@/features/auth/AccountEntry'
import { articlePath } from '@/lib/articleUrl'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from '@/lib/navigation'
import { Search, Instagram, Facebook, Mail, X, Clock, History, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import ClockComponent from './Clock'
import apiClient from '@/lib/apiClient'
import LoadingState from '@/components/common/LoadingState'
import RequestError from '@/components/common/RequestError'
import { requestErrorMessage } from '@/lib/requestError'
import { formatDateToChinese } from '@/lib/dateFormatter'

const toolbarActionClass = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--topbar-accent)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'

function TopSearchBar() {
  const [keyword, setKeyword] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedCategory, setSelectedCategory] = useState(null)
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
        <mark key={index} className="rounded bg-green-100 px-0.5 font-medium text-green-900 dark:bg-sage-900/60 dark:text-sage-200">
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
      setKeyword(urlKeyword)
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
      clearTimeout(debounceTimerRef.current)
      searchAbortControllerRef.current?.abort()
      setIsSearching(false)
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
    const controller = new AbortController()
    searchAbortControllerRef.current = controller

    try {
      setIsSearching(true)
      setSearchError('')
      const response = await apiClient.get('/search/', {
        params: { keyword: searchTerm },
        signal: controller.signal,
      })
      
      const data = response.data || {}
      if (!controller.signal.aborted) setSearchResults(data.results || [])
    } catch (error) {
      // 忽略取消的请求错误
      const isCanceled = 
        error.name === 'CanceledError' || 
        error.name === 'AbortError' ||
        error.code === 'ERR_CANCELED' ||
        error.message?.toLowerCase().includes('canceled') ||
        error.message?.toLowerCase().includes('aborted')
      
      if (!isCanceled && !controller.signal.aborted) {
        setSearchError(requestErrorMessage(error, '搜索失败，请重试'))
        setSearchResults([])
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false)
    }
  }, [])

  // 防抖搜索建议 - 重构后的搜索逻辑
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    searchAbortControllerRef.current?.abort()
    setSearchResults([])
    setSearchError('')
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
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setShowSuggestions(true)
    // Only search suggestions wait for typing to pause.
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

  return (
    <>
      <div style={{ '--topbar-accent': '#ffffff', backgroundColor: '#064e3b' }} className="hidden w-full border-b border-white/10 md:block">
        <div className="mx-auto flex min-h-[44px] w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-1.5">
          <div className="flex min-w-0 items-center gap-2 lg:gap-3"><div className="hidden min-w-0 xl:block"><ClockComponent /></div><PrayerTopbar /></div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* 搜索表单 */}
            <div className="relative w-48 lg:w-52" ref={suggestionsRef}>
              <form onSubmit={handleSubmit} role="search" className="relative flex h-8 items-center rounded-md border border-white/20 bg-white pr-0.5 transition-shadow focus-within:ring-2 focus-within:ring-blue-200/40 dark:border-night-600 dark:bg-night-800">
                <input
                  ref={searchInputRef}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-night-100"
                  type="search"
                  placeholder="搜索内容…"
                  name="keyword"
                  value={keyword}
                  onChange={handleInputChange}
                  onFocus={() => {
                    if (keyword.trim() || searchHistory.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  aria-label="搜索全站内容"
                  autoComplete="off"
                />
                <button
                  className="inline-flex h-6 w-7 shrink-0 items-center justify-center rounded bg-[#064e3b] text-[var(--topbar-accent)] transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-1"
                  type="submit"
                  aria-label="搜索"
                >
                  <Search size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </form>

              {/* 搜索建议和历史 - 重构后的搜索逻辑 */}
              {showSuggestions && (
                <div id="top-search-suggestions" className="absolute right-0 top-full z-[9999] mt-3 max-h-[min(32rem,70vh)] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_16px_48px_-12px_rgba(28,40,32,0.25)] dark:border-night-700 dark:bg-night-overlay">
                  {/* 搜索历史 */}
                  {!keyword.trim() && searchHistory.length > 0 && (
                    <div className="p-2 border-b border-gray-200 dark:border-night-700">
                      <div className="flex items-center justify-between px-2 py-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-night-400">
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
                            className="w-full text-left px-3 py-2 text-sm rounded-lg text-gray-700 transition-colors hover:bg-stone-50 dark:text-night-200 dark:hover:bg-night-700 flex items-center gap-2"
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
                    <div className="p-2 border-b border-gray-200 dark:border-night-700">
                      <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-night-400">
                        <TrendingUp size={14} />
                        <span>热门搜索</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {hotSearches.map((term, index) => (
                          <button
                            key={index}
                            onClick={() => selectHotSearch(term)}
                            className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
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
                      {isSearching && <LoadingState label="正在搜索…" count={2} className="px-3 py-4" />}
                      {!isSearching && searchError && <RequestError message={searchError} onRetry={() => performSearch(keyword.trim())} />}

                      {/* 搜索结果统计和分类筛选 */}
                      {!isSearching && searchResults.length > 0 && (
                        <div className="mb-2 space-y-2">
                          <div className="flex items-center justify-between px-2">
                            <div className="text-xs text-gray-500 dark:text-night-400">
                              找到 <span className="font-semibold text-green-600">{searchResults.length}</span> 个结果
                            </div>
                            {selectedCategory && (
                              <button
                                onClick={clearCategoryFilter}
                                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
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
                                      ? 'bg-green-500 text-white shadow-md'
                                      : 'bg-stone-100 text-gray-600 hover:bg-stone-200 dark:bg-night-700 dark:text-night-200 dark:hover:bg-night-600'
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
                                <div className="px-2 py-1 text-xs font-medium rounded-lg bg-stone-50 text-gray-600 dark:bg-night-900/50 dark:text-night-400">
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
                                    href={articlePath(item.type, item)}
                                    onClick={() => {
                                      setShowSuggestions(false)
                                      saveSearchHistory(keyword)
                                    }}
                                    className={`block px-3 py-2.5 text-sm rounded-xl transition-colors ${
                                      isSelected
                                        ? 'bg-green-50 text-green-900 ring-1 ring-inset ring-green-200 dark:bg-sage-900/30 dark:text-sage-200 dark:ring-sage-800'
                                        : 'text-gray-700 hover:bg-stone-50 dark:text-night-200 dark:hover:bg-night-700'
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
                                        <div className="font-medium line-clamp-2 leading-6 mb-1">
                                          {highlightText(item.标题, keyword)}
                                        </div>
                                        {item.摘要 && (
                                          <div className="text-xs text-gray-500 dark:text-night-400 line-clamp-2 mb-1.5">
                                            {highlightText(item.摘要, keyword)}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
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
                              className="w-full mt-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded transition-colors font-medium border border-green-200"
                            >
                              查看全部 {searchResults.length} 个结果
                            </button>
                          )}
                        </div>
                      )}

                      {/* 无结果提示 */}
                      {!isSearching && !searchError && searchResults.length === 0 && keyword.trim().length >= 2 && (
                        <div className="px-3 py-6 text-center">
                          <div className="text-gray-400 mb-2">
                            <Search size={32} className="mx-auto opacity-50" />
                          </div>
                          <p className="text-sm text-gray-500 mb-2">未找到相关结果</p>
                          <p className="text-xs text-gray-400 mb-3">试试其他关键词或检查拼写</p>
                          <button
                            onClick={() => handleSearch()}
                            className="text-sm text-green-600 hover:text-green-700 font-medium underline"
                          >
                            仍然搜索 &quot;{keyword}&quot;
                          </button>
                        </div>
                      )}

                      {/* 默认搜索按钮（当输入字符少于2个时） */}
                      {keyword.trim().length < 2 && (
                        <button
                          onClick={() => handleSearch()}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg text-gray-700 transition-colors hover:bg-stone-50 dark:text-night-200 dark:hover:bg-night-700 flex items-center gap-2"
                        >
                          <Search size={14} className="text-gray-400" />
                          搜索 &quot;{keyword}&quot;
                        </button>
                      )}

                      {/* 键盘导航提示 */}
                      {keyword.trim().length >= 2 && flatResults.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-night-700 px-2">
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

            <div className="hidden items-center gap-0.5 border-l border-white/10 pl-1.5 lg:flex">
                <a
                  href="https://www.instagram.com/shuwei_365/profilecard/?igsh=MTZ1N2lucXZiNzlsaQ%3D%3D"
                  className={toolbarActionClass}
                  title="Instagram"
                  aria-label="访问 Instagram（新窗口）"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram size={16} strokeWidth={1.75} aria-hidden="true" />
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61568664600545&mibextid=ZbWKwL"
                  className={toolbarActionClass}
                  title="Facebook"
                  aria-label="访问 Facebook（新窗口）"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook size={16} strokeWidth={1.75} aria-hidden="true" />
                </a>
                <a
                  href="mailto:shuwei506@gmail.com"
                  className={toolbarActionClass}
                  title="shuwei506@gmail.com"
                  aria-label="发送邮件至 shuwei506@gmail.com"
                >
                  <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
                </a>
            </div>
            <AccountEntry className={toolbarActionClass} />
          </div>
        </div>
      </div>

    </>
  )
}

export default TopSearchBar

