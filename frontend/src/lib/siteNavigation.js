// One destination list for desktop navigation and the mobile menu.
export const navItems = [
  { path: '/', label: '首页' },
  { path: '/书讯', label: '书讯' },
  { path: '/书评', label: '书评' },
  { path: '/观点', label: '观点' },
  { path: '/译林', label: '译林' },
  { path: '/文艺', label: '文艺' },
  { path: '/文史', label: '文史' },
  { path: '/书库', label: '书库' },
  { path: '/通讯', label: '通讯' },
  { path: '/古籍', label: '古籍' },
  { path: '/论文', label: '论文' },
  { path: '/问答', label: '问答' },
  { path: '/经训', label: '经训' },
]

export function isNavigationActive(pathname, path) {
  let current = pathname.split(/[?#]/)[0]
  try { current = decodeURIComponent(current) } catch { /* Preserve malformed paths. */ }
  return path === '/' ? current === '/' : current === path || current.startsWith(`${path}/`)
}
