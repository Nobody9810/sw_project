import { LocateFixed, X } from 'lucide-react'
import { usePrayerTools } from './PrayerToolsContext'
import { PRAYER_BUTTON } from './prayerStyles'

export default function PrayerLocationNotice() {
  const state = usePrayerTools()
  if (!state?.locationNoticeOpen || state.toolsOpen) return null
  const busy = state.locationStatus === 'locating'
  return <aside aria-labelledby="prayer-location-notice-title" className="fixed inset-x-4 top-4 z-[70] mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 text-gray-900 shadow-lg dark:border-night-700 dark:bg-night-800 dark:text-night-100 sm:top-6">
    <div className="flex items-start gap-3">
      <LocateFixed size={20} className="mt-1 shrink-0 text-green-700 dark:text-sage-400" aria-hidden="true" />
      <div className="min-w-0 flex-1"><h2 id="prayer-location-notice-title" className="text-sm font-semibold">开启定位，查看礼拜时间</h2><p role="status" className="mt-2 text-xs leading-6 text-gray-600 dark:text-night-300">{state.locationError || '允许浏览器访问当前位置后，为你显示当地礼拜时间。暂不开启不影响阅读。'}</p></div>
      <button type="button" onClick={state.dismissLocationNotice} aria-label="关闭定位提醒" className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-green-600 dark:text-night-300 dark:hover:bg-night-700"><X size={18} aria-hidden="true" /></button>
    </div>
    <div className="mt-3 flex flex-wrap justify-end gap-3"><button type="button" onClick={state.dismissLocationNotice} className="min-h-11 rounded-lg px-3 text-sm text-gray-600 dark:text-night-300">暂不开启</button><button type="button" onClick={state.requestLocation} disabled={busy} className={PRAYER_BUTTON}>{busy ? '正在定位…' : '开启定位'}</button></div>
  </aside>
}
