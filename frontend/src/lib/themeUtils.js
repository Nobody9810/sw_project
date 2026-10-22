const THEME_STORAGE_KEY = 'theme'

export const getCurrentTheme = () => {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export const getSavedTheme = () => {
  try {
    if (typeof localStorage === 'undefined') return null
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'dark' || saved === 'light' ? saved : null
  } catch {
    return null
  }
}

const applyTheme = theme => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }))
}

export const setTheme = theme => {
  applyTheme(theme)
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch { /* Theme switching still works when storage is unavailable. */ }
}

export const toggleTheme = () => {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export const initTheme = () => {
  const saved = getSavedTheme()
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  // A system preference must not become a saved manual override.
  applyTheme(saved || (prefersDark ? 'dark' : 'light'))
}

export const watchSystemTheme = callback => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = event => {
    if (!getSavedTheme()) {
      const next = event.matches ? 'dark' : 'light'
      applyTheme(next)
      callback(next)
    }
  }
  if (media.addEventListener) {
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }
  if (media.addListener) {
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }
  return () => {}
}

export const watchStoredTheme = () => {
  if (typeof window === 'undefined') return () => {}
  const handleStorage = event => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) initTheme()
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

// Runs in <head> before the first paint. Contains no user-supplied input.
export const themeInitializationScript = `(function(){var saved=null;try{saved=localStorage.getItem('theme')}catch(e){}var dark=saved==='dark'||(saved!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!dark)})()`
