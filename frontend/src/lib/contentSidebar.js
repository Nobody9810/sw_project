// A collapsible desktop sidebar preference: stored locally, applied to <html> before first paint,
// synchronized across mounted layouts and tabs, and usable when storage is unavailable.
export function createSidebarPreference({ key, attribute, event, media }) {
  const getCollapsed = () => typeof document !== 'undefined' && document.documentElement.getAttribute(attribute) === 'collapsed'
  const apply = collapsed => {
    document.documentElement.setAttribute(attribute, collapsed ? 'collapsed' : 'expanded')
  }
  return {
    getCollapsed,
    getServerSnapshot: () => false,
    setCollapsed(collapsed) {
      if (typeof document === 'undefined') return
      apply(Boolean(collapsed))
      try { localStorage.setItem(key, collapsed ? 'collapsed' : 'expanded') } catch { /* The current page still works without storage. */ }
      document.dispatchEvent(new Event(event))
    },
    subscribe(callback) {
      const receiveStorage = change => {
        if (change.key !== key && change.key !== null) return
        apply(change.newValue === 'collapsed')
        callback()
      }
      document.addEventListener(event, callback)
      window.addEventListener('storage', receiveStorage)
      return () => {
        document.removeEventListener(event, callback)
        window.removeEventListener('storage', receiveStorage)
      }
    },
    getDesktop: () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(media).matches),
    subscribeDesktop(callback) {
      const query = window.matchMedia?.(media)
      query?.addEventListener('change', callback)
      return () => query?.removeEventListener('change', callback)
    },
    initializationScript: `(function(){var closed=false;try{closed=localStorage.getItem('${key}')==='collapsed'}catch(e){}document.documentElement.setAttribute('${attribute}',closed?'collapsed':'expanded')})();`,
  }
}

// Ordinary content pages (9/3 and 8/4 layouts) from 1024px.
const content = createSidebarPreference({ key: 'content-sidebar', attribute: 'data-content-sidebar', event: 'contentSidebarChange', media: '(min-width: 1024px)' })
export const getSidebarCollapsed = content.getCollapsed
export const getSidebarServerSnapshot = content.getServerSnapshot
export const setSidebarCollapsed = content.setCollapsed
export const subscribeSidebar = content.subscribe
export const getDesktopSnapshot = content.getDesktop
export const subscribeDesktop = content.subscribeDesktop

// The 经训 directory is a permanent column from 768px and keeps its own preference.
export const hadithDirectory = createSidebarPreference({ key: 'hadith-directory', attribute: 'data-hadith-directory', event: 'hadithDirectoryChange', media: '(min-width: 768px)' })

// Apply the saved layouts before first paint, including route skeletons.
export const sidebarInitializationScript = content.initializationScript + hadithDirectory.initializationScript
