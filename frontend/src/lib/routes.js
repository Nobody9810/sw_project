export const articleTypes = new Set(['书讯', '书评', '观点', '译林', '文艺', '文史', '通讯', '论文', '古籍', '书库'])
const staticSections = new Set(['问答', '经训', '礼拜时间', '关于我们', '版权声明', '搜索', '登录', '更新说明'])
const positiveId = value => /^\d+$/.test(value || '') && Number.isSafeInteger(Number(value)) && Number(value) > 0

export function classifyRoute(parts = []) {
  const [section, subSection, id] = parts
  if (parts.length === 0) return 'home'
  if (parts.length === 1 && (articleTypes.has(section) || staticSections.has(section))) return 'section'
  if (parts.length === 3 && section === '书评' && subSection === '分类' && positiveId(id)) return 'category'
  if ((parts.length === 2 || (parts.length === 3 && Boolean(id))) && articleTypes.has(section) && positiveId(subSection)) return 'article'
  return 'notFound'
}

function pathParts(pathname) {
  return pathname.split('/').filter(Boolean).map(decodeURIComponent)
}

export function sameRouteParts(a = [], b = []) {
  return a.length === b.length && a.every((part, index) => part === b[index])
}

// Every site page is served by the catch-all page, whose server props only
// matter for the first HTML response. Client navigation to another section
// can skip the /_next/data round trip; the page fetches its own data.
export function isShallowNavigation(href, currentPath) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return false
  try {
    const target = new URL(href, 'https://site.local')
    const current = new URL(currentPath || '/', 'https://site.local')
    const parts = pathParts(target.pathname)
    return classifyRoute(parts) !== 'notFound' && !sameRouteParts(parts, pathParts(current.pathname))
  } catch {
    return false
  }
}
