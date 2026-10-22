import { useEffect, useRef, useState } from 'react'

// A single clock and midnight refresh serve the top bar, dialog and direct route.
export default function usePrayerClock(data, retry) {
  const [now, setNow] = useState(() => Date.now())
  const refreshedFor = useRef('')
  const active = Boolean(data)
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    tick()
    const timer = setInterval(tick, 1000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [active])
  useEffect(() => {
    const key = data ? `${data.timezone}:${data.date}` : ''
    if (data && now >= Date.parse(data.valid_until) && refreshedFor.current !== key) {
      refreshedFor.current = key
      retry()
    }
  }, [data, now, retry])
  return now
}
