export function nextPrayer(data, now = Date.now()) {
  if (!data) return null
  const candidates = [...data.prayers, { key: 'Fajr', label: '晨礼', time: data.next_day_fajr, tomorrow: true }]
  return candidates.find(item => item.time && Date.parse(item.time) > now) || null
}

export function countdown(time, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((Date.parse(time) - now) / 1000))
  if (!Number.isFinite(seconds)) return '—'
  const hours = Math.floor(seconds / 3600)
  return `${String(hours).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function localClock(time, zone) {
  if (!time) return '暂不可用'
  return new Intl.DateTimeFormat('zh-CN', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(time))
}

