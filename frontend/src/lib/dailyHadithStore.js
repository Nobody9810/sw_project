export const EMPTY_DAILY_SNAPSHOT = Object.freeze({ data: null, status: 'loading', expiresAt: 0 })

export function createDailyHadithStore({ fetchDaily, now = Date.now }) {
  let snapshot = EMPTY_DAILY_SNAPSHOT
  let pending = null
  const listeners = new Set()
  const publish = next => {
    snapshot = next
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    load({ force = false } = {}) {
      if (pending) return pending
      if (!force && snapshot.expiresAt > now()) return Promise.resolve(snapshot.data)
      publish({ data: null, status: 'loading', expiresAt: 0 })
      pending = Promise.resolve().then(fetchDaily).then(response => {
        if (response.status === 404) {
          publish({ data: null, status: 'empty', expiresAt: now() + 5 * 60 * 1000 })
          return null
        }
        const data = response.data
        if (!data?.id || !data.daily_date) throw new Error('Invalid daily reading')
        const expiry = Date.parse(data.next_update_at)
        publish({ data, status: 'ready', expiresAt: Number.isFinite(expiry) && expiry > now() ? expiry : now() + 60 * 1000 })
        return data
      }).catch(() => {
        publish({ data: null, status: 'error', expiresAt: 0 })
        return null
      }).finally(() => { pending = null })
      return pending
    },
  }
}
