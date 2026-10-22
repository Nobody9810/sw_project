export const releaseSeenKey = version => `shuwei:release-seen:${version}`

// Storage may be blocked in private/embedded browsers. Remember dismissals for
// this app session even then; never let storage errors interrupt navigation.
export function createReleaseNoticeStore(getStorage) {
  const memory = new Set()
  return {
    has(version) {
      if (memory.has(version)) return true
      try { return getStorage()?.getItem(releaseSeenKey(version)) === '1' } catch { return false }
    },
    mark(version) {
      memory.add(version)
      try { getStorage()?.setItem(releaseSeenKey(version), '1') } catch { /* Session fallback. */ }
    },
  }
}

export const releaseNoticeStore = createReleaseNoticeStore(() => window.localStorage)

export async function fetchReleaseNotice(client, signal, store = releaseNoticeStore) {
  const { data } = await client.get('/releases/latest/', { signal })
  const note = data?.release
  if (signal.aborted || !note || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(note.version)
      || store.has(note.version)) return null
  return note
}
