function identity(value) {
  try {
    const url = new URL(value, 'https://site.local')
    return JSON.stringify([url.pathname.split('/').filter(Boolean).map(decodeURIComponent), url.searchParams.toString()])
  } catch {
    return value
  }
}

function pathname(value) {
  try {
    return new URL(value, 'https://site.local').pathname.split('/').filter(Boolean).map(decodeURIComponent).join('/')
  } catch {
    return value
  }
}

const samePath = (a, b) => b !== undefined && pathname(a) === pathname(b)

// A route completing only means its code/props arrived, not that its data did.
export function createPageTransition(onChange) {
  let current = null
  const matches = url => current && identity(current.url) === identity(url)
  const finish = () => { current = null; onChange(null) }
  return {
    start(url, options, fromUrl) {
      // In-page shallow updates (e.g. clearing 经训 filters) keep their content.
      if (options?.shallow && samePath(url, fromUrl)) return
      current = { url, routeComplete: false, contentReady: false }
      onChange(current)
    },
    complete(url) {
      if (!matches(url)) return
      current.routeComplete = true
      if (current.contentReady) finish()
    },
    ready(url) {
      if (!matches(url)) return
      current.contentReady = true
      if (current.routeComplete) finish()
    },
    fail(_error, url) {
      if (matches(url)) finish()
    },
  }
}
