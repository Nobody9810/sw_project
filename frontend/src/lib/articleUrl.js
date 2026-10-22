export function articleSlug(title) {
  const text = String(title || '').normalize('NFC')
    .replace(/(?:[\s/\\?#%]|\p{Cc})+/gu, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
  return Array.from(text).slice(0, 80).join('').replace(/-$/g, '') || '文章'
}

export function articlePath(section, article) {
  const type = String(section).replace(/^\/+|\/+$/g, '')
  const base = `/${encodeURIComponent(type)}/${article.id}/`
  return article.标题 ? `${base}${encodeURIComponent(articleSlug(article.标题))}/` : base
}
