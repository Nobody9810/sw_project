function identity(value) {
  try {
    const url = new URL(value, 'https://site.local')
    return JSON.stringify([url.pathname.split('/').filter(Boolean).map(decodeURIComponent), url.searchParams.toString()])
  } catch {
    return value
  }
}

// A route completing only means its code/props arrived, not that its data did.
export function createPageTransition(onChange) {
  let current = null
  const matches = url => current && identity(current.url) === identity(url)
  const finish = () => { current = null; onChange(null) }
  return {
    start(url, options) {
      if (options?.shallow) return
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
