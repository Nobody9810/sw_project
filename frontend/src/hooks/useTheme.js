import { useState, useEffect, useCallback } from 'react'
import { getCurrentTheme, setTheme, toggleTheme as toggleThemeUtil, watchSystemTheme } from '../utils/themeUtils'

/**
 * 自定义 Hook：管理主题状态
 * @returns {{ isDark: boolean, theme: 'dark' | 'light', toggleTheme: () => void, setTheme: (theme: 'dark' | 'light') => void }}
 */
export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return getCurrentTheme() === 'dark'
    }
    return false
  })

  // 检查主题变化
  const checkTheme = useCallback(() => {
    setIsDark(getCurrentTheme() === 'dark')
  }, [])

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme = toggleThemeUtil()
    setIsDark(newTheme === 'dark')
  }, [])

  // 设置主题
  const setThemeValue = useCallback((theme) => {
    setTheme(theme)
    setIsDark(theme === 'dark')
  }, [])

  // 监听主题变化
  useEffect(() => {
    // 初始检查
    checkTheme()

    // 监听主题变化事件
    const handleThemeChange = () => {
      checkTheme()
    }

    document.addEventListener('themeChange', handleThemeChange)

    // 使用 MutationObserver 监听 body 类变化
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })

    // 监听系统主题变化（仅在未手动设置主题时）
    const unwatchSystem = watchSystemTheme(checkTheme)

    return () => {
      document.removeEventListener('themeChange', handleThemeChange)
      observer.disconnect()
      unwatchSystem()
    }
  }, [checkTheme])

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    toggleTheme,
    setTheme: setThemeValue
  }
}

