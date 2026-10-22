export const articleTypes = new Set(['书讯', '书评', '观点', '译林', '文艺', '文史', '通讯', '论文', '古籍', '书库'])
const staticSections = new Set(['问答', '经训', '礼拜时间', '关于我们', '版权声明', '搜索', '登录'])
const positiveId = value => /^\d+$/.test(value || '') && Number.isSafeInteger(Number(value)) && Number(value) > 0

export function classifyRoute(parts = []) {
  const [section, subSection, id] = parts
  if (parts.length === 0) return 'home'
  if (parts.length === 1 && (articleTypes.has(section) || staticSections.has(section))) return 'section'
  if (parts.length === 3 && section === '书评' && subSection === '分类' && positiveId(id)) return 'category'
  if ((parts.length === 2 || (parts.length === 3 && Boolean(id))) && articleTypes.has(section) && positiveId(subSection)) return 'article'
  return 'notFound'
}
