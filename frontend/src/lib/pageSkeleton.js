import { articleTypes, classifyRoute } from './routes'
import { bookTypes } from './contentLayout'

export function detailSkeletonKind(section) {
  return section === '书库' ? 'library' : section === '书讯' ? 'news' : ['古籍', '论文'].includes(section) ? 'document' : 'article'
}

export function pageSkeleton(value) {
  let parts
  try {
    parts = Array.isArray(value) ? value : new URL(value, 'https://site.local').pathname.split('/').filter(Boolean).map(decodeURIComponent)
  } catch { return { kind: 'article', section: '' } }
  const [section = ''] = parts
  const route = classifyRoute(parts)
  if (route === 'home') return { kind: 'home', section }
  if (route === 'category') return { kind: 'reviews', section }
  if (route === 'article') return { kind: detailSkeletonKind(section), section }
  if (route === 'section' && articleTypes.has(section)) return { kind: bookTypes.has(section) ? 'books' : 'list', section }
  const other = { 礼拜时间: 'prayers', 登录: 'auth', 问答: 'qa', 经训: 'hadith-overview', 搜索: 'search', 关于我们: 'about', 版权声明: 'copyright' }
  return { kind: other[section] || 'article', section }
}
