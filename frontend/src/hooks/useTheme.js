import { useState, useEffect, useCallback } from 'react'
import { getCurrentTheme, setTheme, toggleTheme as toggleThemeUtil, watchSystemTheme, watchStoredTheme } from '@/lib/themeUtils'

/**
 * 自定义 Hook：管理主题状态
 * @returns {{ isDark: boolean, theme: 'dark' | 'light', toggleTheme: () => void, setTheme: (theme: 'dark' | 'light') => void }}
 */
export const useTheme = () => {
  const [isDark, setIsDark] = useState(false)

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

    // Tailwind and all theme consumers share the html.dark selector.
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    // 监听系统主题变化（仅在未手动设置主题时）
    const unwatchSystem = watchSystemTheme(checkTheme)
    const unwatchStorage = watchStoredTheme()

    return () => {
      document.removeEventListener('themeChange', handleThemeChange)
      observer.disconnect()
      unwatchSystem()
      unwatchStorage()
    }
  }, [checkTheme])

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    toggleTheme,
    setTheme: setThemeValue
  }
}

