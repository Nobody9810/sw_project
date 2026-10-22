import { useEffect, useSyncExternalStore } from 'react'
import apiClient from '@/lib/apiClient'
import { createDailyHadithStore, EMPTY_DAILY_SNAPSHOT } from '@/lib/dailyHadithStore'

const store = createDailyHadithStore({
  fetchDaily: () => apiClient.get('/hadith/hadiths/daily/', {
    validateStatus: status => status === 200 || status === 404,
  }),
})
const serverSnapshot = () => EMPTY_DAILY_SNAPSHOT

export default function useDailyHadith() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, serverSnapshot)
  useEffect(() => {
    const refresh = () => { void store.load() }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    const timer = snapshot.expiresAt > Date.now()
      ? setTimeout(refresh, snapshot.expiresAt - Date.now() + 100) : null
    return () => {
      if (timer !== null) clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [snapshot.expiresAt])
  return { ...snapshot, retry: () => store.load({ force: true }) }
}
