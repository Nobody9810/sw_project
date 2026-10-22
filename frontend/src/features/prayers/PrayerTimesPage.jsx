import Head from 'next/head'
import { Clock3, LocateFixed, MapPin, Sunrise } from 'lucide-react'
import { usePageReady } from '@/components/common/PageLoadContext'
import RequestError from '@/components/common/RequestError'
import { formatDateToChinese } from '@/lib/dateFormatter'
import { usePrayerTools } from './PrayerToolsContext'
import { countdown, localClock, nextPrayer } from './prayerTime'
import { PrayerResultsSkeleton } from './PrayerSkeleton'
import { PRAYER_FRAME, PRAYER_CARD, PRAYER_GRID, PRAYER_TILE } from '@/lib/contentLayout'
import { PRAYER_BUTTON } from './prayerStyles'

export function PrayerLocationControl({ state }) {
  const busy = ['checking', 'locating'].includes(state.locationStatus)
  return <section className={`mb-6 ${PRAYER_CARD}`} aria-label="所在地">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-medium">{state.query ? '已使用当前位置' : '开启定位后显示礼拜时间'}</h2><p className="mt-2 text-xs leading-6 text-gray-500 dark:text-night-400">{state.query ? '使用约公里精度的位置查询当地时间。' : '请允许浏览器访问位置；暂不开启不影响阅读。'}</p></div><button type="button" onClick={state.requestLocation} disabled={busy} className={PRAYER_BUTTON}><LocateFixed size={16} aria-hidden="true" />{busy ? '正在定位…' : state.query ? '更新位置' : '开启定位'}</button></div>
    {state.locationError && <p role="status" className="mt-3 text-sm leading-6 text-gray-600 dark:text-night-300">{state.locationError}</p>}
  </section>
}

export function PrayerResults({ data, label, retry, now }) {
  const expired = now >= Date.parse(data.valid_until)
  const next = expired ? null : nextPrayer(data, now)
  return <div className="space-y-4">
    <section className={`${PRAYER_CARD} border-green-200 dark:border-sage-800`} aria-label="下一番礼拜">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-night-300">
        <span className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" />{label}</span>
        <span>{formatDateToChinese(data.date)} · 当地时间</span>
      </div>
      {next ? <><h2 className="mt-5 text-xl font-semibold sm:text-2xl">下一番 · {next.tomorrow ? '明日' : ''}{next.label} <span className="ml-2 tabular-nums text-green-700 dark:text-sage-400">{localClock(next.time, data.timezone)}</span></h2><p className="mt-3 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-night-400"><Clock3 size={16} aria-hidden="true" />还有 <span className="tabular-nums">{countdown(next.time, now)}</span></p></> : <p className="mt-5 text-sm text-gray-500 dark:text-night-400">{expired ? '正在更新当地日期…' : '下一番时间暂不可用，请重试或参考当地时间表。'}</p>}
      <p className="mt-3 break-words text-xs text-gray-500 dark:text-night-400">{data.timezone}</p>
    </section>
    <section aria-label="五番礼拜时间" className={PRAYER_GRID}>{data.prayers.map(item => <div key={item.key} className={`${PRAYER_TILE} ${next?.key === item.key && !next.tomorrow ? 'border-green-600 bg-green-50 dark:border-sage-500 dark:bg-sage-900/30' : 'border-gray-200 bg-white dark:border-night-700 dark:bg-night-800'}`}>
      <h3 className="text-sm text-gray-600 dark:text-night-300">{item.label}</h3><p className="mt-3 break-words text-2xl font-semibold tabular-nums sm:text-xl lg:text-2xl">{localClock(item.time, data.timezone)}</p>
    </div>)}</section>
    <p className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-night-400"><Sunrise size={16} aria-hidden="true" />日出 {localClock(data.sunrise, data.timezone)}<span className="text-xs">（非礼拜时间）</span></p>
    {data.warnings.map(warning => <p key={warning} className="text-sm leading-6 text-amber-800 dark:text-amber-200">{warning}</p>)}
    <p className="text-xs leading-6 text-gray-500 dark:text-night-400">数据来源：<a className="underline underline-offset-2" href="https://aladhan.com/prayer-times-api" target="_blank" rel="noreferrer">AlAdhan</a>。此处展示计算入礼时间；清真寺集体礼拜及主麻时间请以当地安排为准。</p>
    <button type="button" onClick={retry} className="min-h-11 text-sm text-green-700 underline underline-offset-4 dark:text-sage-400">重新加载时间</button>
  </div>
}

export function PrayerTimesContent({ state, compact = false }) {
  if (!state) return null
  return <div className={`${compact ? 'w-full p-4 sm:p-6' : PRAYER_FRAME} text-gray-900 dark:text-night-100`}>
    <h1 className="text-2xl font-semibold">礼拜时间</h1><p className="mb-6 mt-2 text-sm leading-6 text-gray-500 dark:text-night-400">按所在地查看五番时间，无需登录。</p>
    <PrayerLocationControl state={state} />
    {state.loading && <div role="status" aria-busy="true"><span className="sr-only">正在查询时间…</span><div className="motion-safe:animate-pulse"><PrayerResultsSkeleton /></div></div>}
    {state.error && <RequestError message={state.error} onRetry={state.retry} />}
    {!state.loading && state.data && <PrayerResults data={state.data} label={state.query.label} retry={state.retry} now={state.now} />}
    {!state.loading && !state.error && !state.query && <p className="py-6 text-center text-sm text-gray-500 dark:text-night-400">未开启定位，暂不显示礼拜时间。</p>}
    <p className="mt-6 text-xs leading-6 text-gray-500 dark:text-night-400">位置约化到公里精度，仅用于查询礼拜时间，不写入账户、数据库或浏览器存储。</p>
  </div>
}

export default function PrayerTimesPage() {
  const state = usePrayerTools()
  usePageReady(state?.loading || false)
  return <>
    <Head><title>礼拜时间 — 書味</title><meta name="description" content="查询所在地五番礼拜时间，开启定位后查看当地时间。" /></Head>
    <PrayerTimesContent state={state} />
  </>
}
