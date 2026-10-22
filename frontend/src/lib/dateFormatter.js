/**
 * 格式化日期为"年月日"格式，例如：2013年3月3日
 * @param {string|Date} dateValue - 日期值（字符串或Date对象）
 * @returns {string} 格式化后的日期字符串，如果日期无效则返回空字符串
 */
export function formatDateToChinese(dateValue) {
  if (!dateValue) {
    return ''
  }
  
  // Preserve calendar dates from Django's USE_TZ=False values, independently of
  // the browser/server timezone. Offset timestamps use the site's timezone.
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$)/.test(dateValue)) {
    const [year, month, day] = dateValue.slice(0, 10).split('-').map(Number)
    const check = new Date(Date.UTC(year, month - 1, day))
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return ''
    return `${year}年${month}月${day}日`
  }
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date)
  const value = kind => parts.find(part => part.type === kind)?.value || ''
  return `${value('year')}年${value('month')}月${value('day')}日`
}
