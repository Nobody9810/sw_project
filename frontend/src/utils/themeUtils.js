/**
 * 全局主题工具函数
 * 统一管理主题切换逻辑
 */

const THEME_STORAGE_KEY = 'theme'
const DARK_THEME_CLASS = 'dark-theme'

/**
 * 获取当前主题
 * @returns {'dark' | 'light'}
 */
export const getCurrentTheme = () => {
  if (typeof document === 'undefined') {
    return 'light'
  }
  return document.body.classList.contains(DARK_THEME_CLASS) ? 'dark' : 'light'
}

/**
 * 获取保存的主题偏好
 * @returns {'dark' | 'light' | null}
 */
export const getSavedTheme = () => {
  if (typeof localStorage === 'undefined') {
    return null
  }
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  return saved === 'dark' || saved === 'light' ? saved : null
}

/**
 * 设置主题
 * @param {'dark' | 'light'} theme
 */
export const setTheme = (theme) => {
  if (typeof document === 'undefined') {
    return
  }
  
  const body = document.body
  
  if (theme === 'dark') {
    body.classList.add(DARK_THEME_CLASS)
  } else {
    body.classList.remove(DARK_THEME_CLASS)
  }
  
  // 保存到 localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
  
  // 触发主题变化事件
  const themeChangeEvent = new CustomEvent('themeChange', {
    detail: { theme }
  })
  document.dispatchEvent(themeChangeEvent)
}

/**
 * 切换主题
 * @returns {'dark' | 'light'} 新的主题
 */
export const toggleTheme = () => {
  const currentTheme = getCurrentTheme()
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  setTheme(newTheme)
  return newTheme
}

/**
 * 初始化主题
 * 从 localStorage 读取保存的主题，如果没有则使用系统偏好或默认浅色
 */
export const initTheme = () => {
  if (typeof document === 'undefined') {
    return
  }
  
  const savedTheme = getSavedTheme()
  const body = document.body
  
  if (savedTheme) {
    // 使用保存的主题
    setTheme(savedTheme)
  } else {
    // 检查系统偏好
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initialTheme = prefersDark ? 'dark' : 'light'
      setTheme(initialTheme)
    } else {
      // 默认使用浅色主题
      setTheme('light')
    }
  }
}

/**
 * 监听系统主题变化
 * @param {(theme: 'dark' | 'light') => void} callback
 * @returns {() => void} 清理函数
 */
export const watchSystemTheme = (callback) => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handleChange = (e) => {
    // 只有在没有手动设置主题时才响应系统变化
    if (!getSavedTheme()) {
      const theme = e.matches ? 'dark' : 'light'
      setTheme(theme)
      callback(theme)
    }
  }
  
  // 现代浏览器
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }
  // 旧浏览器兼容
  else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }
  
  return () => {}
}

