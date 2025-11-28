/**
 * 格式化日期为"年月日"格式，例如：2013年3月3日
 * @param {string|Date} dateValue - 日期值（字符串或Date对象）
 * @returns {string} 格式化后的日期字符串，如果日期无效则返回空字符串
 */
export function formatDateToChinese(dateValue) {
  if (!dateValue) {
    return ''
  }
  
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  return `${year}年${month}月${day}日`
}

