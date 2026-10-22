import { SkeletonBlock as Block } from '@/components/common/SkeletonContent'
import { PRAYER_CARD, PRAYER_FRAME, PRAYER_GRID, PRAYER_TILE } from '@/lib/contentLayout'

export function PrayerResultsSkeleton() {
  return <div className="space-y-4" aria-hidden="true">
    <div className={PRAYER_CARD}><Block className="mb-3 h-5 w-40" /><Block className="h-9 w-64 max-w-full" /><Block className="mt-3 h-5 w-48" /></div>
    <div className={PRAYER_GRID}>{[0, 1, 2, 3, 4].map(item => <div key={item} className={`${PRAYER_TILE} border-gray-200 dark:border-night-700`}><Block className="mb-3 h-5 w-12" /><Block className="h-8 w-20 max-w-full" /></div>)}</div>
    <Block className="h-5 w-64 max-w-full" />
  </div>
}

export default function PrayerSkeleton() {
  return <div className={PRAYER_FRAME}>
    <Block className="mb-3 h-8 w-32" /><Block className="mb-6 h-5 w-64 max-w-full" />
    <div className={`mb-6 ${PRAYER_CARD}`}><Block className="mb-3 h-5 w-24" /><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><Block className="h-11 w-full" /><Block className="h-11 w-28" /></div></div>
    <PrayerResultsSkeleton />
  </div>
}
