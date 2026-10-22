import { Clock3 } from 'lucide-react'
import { usePrayerTools } from './PrayerToolsContext'
import { countdown, nextPrayer } from './prayerTime'

export default function PrayerTopbar() {
  const state = usePrayerTools()
  if (!state?.query) return null
  const expired = state.data && state.now >= Date.parse(state.data.valid_until)
  const next = expired ? null : nextPrayer(state.data, state.now)
  const label = state.loading ? '正在查询礼拜时间…' : state.error ? '礼拜时间暂不可用' : !state.query ? '礼拜时间 · 尚未设置所在地' : !next ? '下一番时间暂不可用' : `下一番 ${next.tomorrow ? '明日' : ''}${next.label} · 还有 ${countdown(next.time, state.now)}`
  return <div className="inline-flex min-h-8 min-w-0 items-center gap-1.5 px-1 text-xs text-white" title={state.query?.label ? `${state.query.label} · ${label}` : label}>
    <Clock3 size={14} className="shrink-0" aria-hidden="true" /><span className="truncate tabular-nums">{label}</span>
  </div>
}
