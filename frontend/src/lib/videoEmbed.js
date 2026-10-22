// Turn the backend's `a.video-embed` link (provider watch page) into a player that is
// loaded only after the reader clicks. Anything unrecognised stays an ordinary link.
const VIDEO_ID = /^[A-Za-z0-9_-]{6,20}$/

export function parseVideoLink(href) {
  let url
  try { url = new URL(href) } catch { return null }
  if (url.protocol !== 'https:') return null
  if (url.hostname === 'www.youtube.com' && url.pathname === '/watch' && VIDEO_ID.test(url.searchParams.get('v') || '')) {
    const start = /^(\d{1,6})s$/.exec(url.searchParams.get('t') || '')?.[1]
    return { label: 'YouTube', page: url.href,
      src: `https://www.youtube-nocookie.com/embed/${url.searchParams.get('v')}?autoplay=1${start ? `&start=${start}` : ''}` }
  }
  const vimeo = /^\/(\d{1,12})$/.exec(url.pathname)
  if (url.hostname === 'vimeo.com' && vimeo) return { label: 'Vimeo', page: url.href, src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` }
  return null
}
