// Shared by server metadata and share actions; no browser DOM or platform SDK.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', middot: '·', copy: '©', reg: '®', trade: '™', laquo: '«', raquo: '»' }
const EMPTY = /^(?:暂无(?:内容简介|简介|内容|摘要)?|无作者信息|无|待补充)$/
export const SHARE_FALLBACK_IMAGE = '/assets/images/logo_black.png'

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key) => {
    if (key[0] !== '#') return ENTITIES[key] ?? ENTITIES[key.toLowerCase()] ?? entity
    const point = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1))
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : ''
  })
}

export function sharePlainText(value) {
  if (typeof value !== 'string') return ''
  return decodeEntities(value.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:p|div|h[1-6]|li|ul|ol|blockquote|br|tr|td|section)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ''))
    .replace(/[\p{Cc}\u200b\ufeff]/gu, ' ').replace(/\s+/g, ' ').trim()
}

export function shortenShareText(value, maximum) {
  const points = Array.from(value)
  return points.length > maximum ? points.slice(0, Math.max(0, maximum - 1)).join('') + '…' : value
}

function firstBodyImage(html) {
  if (typeof html !== 'string') return []
  // Only inspect actual image tags, never comments or script strings.
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  return [...body.matchAll(/<img\b[^>]*>/gi)].map(([tag]) => {
    const src = tag.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    return src ? decodeEntities(src[1] ?? src[2] ?? src[3]) : ''
  })
}

export function articleShareImage(article, publicUrl, backendUrl = '') {
  for (const candidate of [article?.图片, ...firstBodyImage(article?.内容), SHARE_FALLBACK_IMAGE]) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue
    try {
      const image = new URL(candidate.trim(), publicUrl)
      if (!['http:', 'https:'].includes(image.protocol) || image.username || image.password) continue
      if (backendUrl && image.origin === new URL(backendUrl).origin && image.pathname.startsWith('/media/')) {
        return new URL(image.pathname + image.search, publicUrl).href
      }
      return image.href
    } catch { /* Try the next source, including the local brand image. */ }
  }
  return ''
}

export function articleShareData(article, section = '') {
  const title = sharePlainText(article?.标题) || '書味'
  const rawAuthor = sharePlainText(article?.作者)
  const author = EMPTY.test(rawAuthor) ? '' : shortenShareText(rawAuthor, 60)
  const content = [article?.摘要, article?.简介, article?.内容].map(sharePlainText).find(text => text && !EMPTY.test(text))
  const fallback = article ? `在書味阅读《${title}》${section ? `，浏览${section}详情` : ''}。` : '書味：书讯、书评与文化阅读'
  const excerpt = shortenShareText(content || fallback, 160)
  const prefix = author ? `作者：${author}｜` : ''
  const description = prefix + shortenShareText(excerpt, 160 - Array.from(prefix).length)
  return { title, author, excerpt, description }
}

export function articleShareText(data) {
  return [data.title, data.description].filter(Boolean).join('\n')
}
