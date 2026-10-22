import PrayerSkeleton from '@/features/prayers/PrayerSkeleton'
import { UPDATES_FRAME } from '@/lib/contentLayout'
import { AUTH_FRAME } from '@/lib/contentLayout'
import MobileListHeading from '@/components/content/MobileListHeading'
import ContentWithSidebar from './ContentWithSidebar'
import LoadingState from './LoadingState'
import { SkeletonBlock as Block, TextSkeleton, CategoryTabsSkeleton } from './SkeletonContent'
import { LIST_FRAME, DETAIL_FRAME, SIDEBAR_HEADER, SIDEBAR_BODY, SIDEBAR_LIST_BODY, SIDEBAR_ROW, QA_FRAME, QA_HEADER, QA_COLUMNS, QA_FORM_BODY } from '@/lib/contentLayout'

function SidebarSkeleton({ section, detail }) {
  return <div className="space-y-3" data-skeleton="sidebar">
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-night-700 dark:bg-night-800">
      <div className={`border-b border-gray-200 ${SIDEBAR_HEADER} dark:border-night-700`}><Block className="h-5 w-24" /></div>
      <div className={SIDEBAR_BODY}><TextSkeleton lines={6} /><div className="mt-4 border-t border-gray-200 pt-3 dark:border-night-700"><TextSkeleton lines={3} /></div><Block className="mt-3 h-4 w-20" /></div>
    </div>
    {section === '书评' && <div className="rounded-xl border border-gray-200 p-3 dark:border-night-700"><Block className="mb-4 h-5 w-24" /><div className="flex flex-wrap gap-2">{[0, 1, 2].map(tag => <Block key={tag} className="h-8 w-16" />)}</div></div>}
    {(detail ? [5, 6, 3] : [6, 3]).map((rows, index) => <div key={index} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-night-700 dark:bg-night-800">
      <div className={`border-b border-gray-100 ${SIDEBAR_HEADER} dark:border-night-700`}><Block className="h-5 w-24" /></div>
      <div className={`divide-y divide-gray-100 ${SIDEBAR_LIST_BODY} dark:divide-night-700`}>{Array.from({ length: rows }, (_, row) => <div key={row} className={SIDEBAR_ROW}><Block className="mb-1 h-4 w-full" /><Block className="h-3 w-1/2" /></div>)}</div>
    </div>)}
  </div>
}


function SearchSkeleton() {
  return <div className="mb-6 md:mb-8"><Block className="mb-2 h-5 w-48" /><div className="flex flex-col gap-2 sm:flex-row md:gap-3"><Block className="h-12 flex-1 md:h-14" /><Block className="h-12 w-full sm:w-32 md:h-14" /></div></div>
}

function DirectorySkeleton() {
  return <div className="hidden w-80 shrink-0 self-start rounded-xl border border-gray-200 bg-white dark:border-night-700 dark:bg-night-800 md:block">
    <div className="border-b border-gray-200 p-4 dark:border-night-700"><Block className="h-7 w-32" /><Block className="mt-4 h-10 w-full" /></div>
    <div className="space-y-3 p-4 md:p-6">{Array.from({ length: 12 }, (_, row) => <Block key={row} className={`h-8 ${row % 3 ? 'w-4/5' : 'w-full'}`} />)}</div>
  </div>
}

function QAPageSkeleton() {
  return <div className={QA_FRAME}>
    <header className={QA_HEADER}>
      <div className="flex items-center justify-between gap-3"><Block className="h-8 w-20 md:h-9" /><Block className="h-4 w-24" /></div>
      <Block className="mt-2 h-6 w-56 max-w-full" />
      <Block className="mt-4 h-9 w-28 lg:hidden" />
    </header>
    <div className={QA_COLUMNS}>
      <div className="hidden rounded-xl border border-gray-200 bg-white dark:border-night-700 dark:bg-night-800 lg:block lg:self-start">
        <div className="border-b border-gray-100 p-4 dark:border-night-700"><Block className="h-5 w-24" /></div>
        <div className={QA_FORM_BODY}>
          <Block className="mb-4 h-12 w-full" /><Block className="h-[218px] w-full" />
          <Block className="mb-4 ml-auto mt-2 h-4 w-16" /><Block className="h-10 w-full" /><Block className="mx-auto mt-3 h-5 w-32" />
        </div>
      </div>
      <div className="min-w-0"><LoadingState animate={false} kind="qa" /></div>
    </div>
  </div>
}

function HomeSkeleton() {
  const module = 'rounded-none bg-transparent sm:rounded-lg sm:border border-gray-200 dark:border-night-700 sm:bg-white sm:p-4 sm:dark:bg-night-800'
  const header = <div className="mb-2 flex justify-between border-b border-gray-200 pb-2 dark:border-night-700"><Block className="h-7 w-24" /><Block className="h-5 w-12" /></div>
  return <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
    <div className="mb-8 flex flex-col gap-6 lg:flex-row"><div className="w-full lg:w-[60%] lg:flex lg:flex-col"><LoadingState className="h-full" animate={false} kind="featured-book" /></div><div className={`w-full lg:w-[40%] ${module}`}>{header}<LoadingState animate={false} kind="home-news" count={5} /></div></div>
    <div className={`mb-8 ${module}`}>{header}<LoadingState animate={false} kind="carousel" /></div>
    <div className="flex flex-col gap-6 lg:flex-row"><div className="w-full space-y-6 lg:w-[70%]">{[0, 1].map(group => <div key={group} className="space-y-6"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[0, 1].map(column => <div key={column} className={module}>{header}<LoadingState animate={false} kind="home-category" count={5} /></div>)}</div>{group === 0 && <div className={module}>{header}<LoadingState animate={false} kind="home-qa" count={3} /></div>}</div>)}</div><div className="w-full space-y-6 lg:w-[30%]">{[0, 1].map(group => <div key={group} className={module}>{header}<LoadingState animate={false} kind="home-category" count={7} /></div>)}</div></div>
  </div>
}

function PageShape({ kind, section }) {
  if (kind === 'updates') return <div className={UPDATES_FRAME}><Block className="mb-3 h-8 w-32" /><Block className="mb-6 h-5 w-64 max-w-full" /><LoadingState kind="updates" count={5} animate={false} /></div>
  if (['list', 'books', 'reviews'].includes(kind)) return <div className={LIST_FRAME}>{kind !== 'reviews' && <MobileListHeading title={section || '内容'} loading />}{kind === 'list' && section === '书评' && <CategoryTabsSkeleton />}<ContentWithSidebar placeholder mobileCollapsible sidebar={<SidebarSkeleton section={section} />}><LoadingState animate={false} kind={kind} /></ContentWithSidebar></div>
  if (['article', 'news', 'library', 'document'].includes(kind)) {
    const library = kind === 'library'
    return <div className={DETAIL_FRAME}><ContentWithSidebar placeholder wide={!library} sidebar={<SidebarSkeleton section={section} detail />}><LoadingState animate={false} kind={kind} /></ContentWithSidebar></div>
  }
  if (kind === 'prayers') return <PrayerSkeleton />
  if (kind === 'auth') return <div className={AUTH_FRAME}><LoadingState animate={false} kind="auth" /></div>
  if (kind === 'home') return <HomeSkeleton />
  if (kind === 'qa') return <QAPageSkeleton />
  if (kind === 'hadith-overview') return <div className="min-h-screen bg-gray-50 dark:bg-night-900"><div className="mx-auto flex max-w-7xl gap-6 px-4 py-6"><DirectorySkeleton /><div className="min-w-0 flex-1"><div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 dark:border-night-700 dark:bg-night-800 md:mb-8"><div className="border-b border-gray-200 px-4 py-3 dark:border-night-700"><Block className="h-7 w-28" /></div><div className="p-5 sm:p-6"><TextSkeleton lines={6} /><TextSkeleton lines={3} className="mt-4 border-t border-gray-200 pt-3 dark:border-night-700" /></div></div><SearchSkeleton /><Block className="mx-auto my-12 h-5 w-2/3" /></div></div></div>
  if (kind === 'search') return <div className="w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8"><Block className="mt-6 h-11 w-full sm:hidden" /><Block className="my-4 h-8 w-40" />{[0, 1].map(group => <div key={group} className="mb-6"><Block className="my-4 h-7 w-24" /><div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map(item => <div key={item} className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-night-700 dark:bg-night-800"><Block className="h-4 w-8" /><Block className="mb-2 mt-1 h-7 w-full" /><Block className="h-4 w-24" /></div>)}</div></div>)}</div>
  if (kind === 'about') return <div className="w-full overflow-hidden"><Block rounded={false} className="mb-8 h-64 w-full md:h-[450px]" /><div className="mx-auto max-w-7xl px-0 md:px-8">{[0, 1].map(section => <div key={section} className={`mb-12 flex flex-col items-center gap-6 px-0 py-6 md:py-8 md:mb-32 ${section ? 'md:flex-row-reverse' : 'md:flex-row'} md:gap-16 md:px-8`}><div className="w-full flex-1"><Block className="mb-8 h-10 w-1/2" /><TextSkeleton lines={6} /></div><Block className="h-56 w-full flex-1 md:h-[400px]" /></div>)}</div></div>
  if (kind === 'copyright') return <div className="mx-auto w-full max-w-5xl px-0 py-8 sm:px-6 md:py-12 lg:px-8"><div className="mb-8 border-b border-gray-200 pb-8 dark:border-night-700 md:mb-16"><Block className="mx-auto mb-4 h-9 w-3/4 md:h-10 lg:h-12" /><Block className="mx-auto h-5 w-48" /></div><div className="space-y-6 md:space-y-12">{[0, 1, 2].map(section => <div key={section} className="rounded-lg border border-gray-100 bg-white p-4 dark:border-night-700 dark:bg-night-800 md:p-8"><Block className="mb-4 h-7 w-1/3" /><TextSkeleton lines={5} /></div>)}</div></div>
  return <LoadingState animate={false} kind="article" />
}

// Navigation placeholders read only the layout preference; they never request page APIs.
export default function PageSkeleton({ kind = 'article', section = '', label = '正在打开页面…' }) {
  return <div role="status" aria-busy="true" aria-live="polite" data-page-skeleton={kind}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="motion-safe:animate-pulse"><PageShape kind={kind} section={section} /></div>
  </div>
}
