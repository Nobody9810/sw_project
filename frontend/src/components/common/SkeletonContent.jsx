import { AUTH_CARD } from '@/lib/contentLayout'
import { ARTICLE_ROW, ARTICLE_IMAGE, ARTICLE_BODY, BOOK_COLUMNS, BOOK_COVER, BOOK_CARD, DETAIL_CARD, NEWS_BOOK_COLUMNS, NEWS_BOOK_TABS, NEWS_BOOK_TAB, LIBRARY_HEADER, SIDEBAR_ROW, HOME_FEATURED_CARD, HOME_FEATURED_CONTENT, QA_CARD, QA_QUESTION_BODY, QA_ANSWER_BODY, QURAN_FRAME, QURAN_ROW, DOCUMENT_BLEED, DOCUMENT_VIEWER_FRAME, DOCUMENT_VIEWER_HEIGHT } from '@/lib/contentLayout'

export function SkeletonBlock({ className = '', onDark = false, rounded = true }) {
  return <div className={`${rounded ? 'rounded' : ''} ${onDark ? 'bg-white/25' : 'bg-gray-200 dark:bg-night-700'} ${className}`} />
}

export function TextSkeleton({ lines = 3, onDark = false, className = '' }) {
  return <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }, (_, line) => <SkeletonBlock key={line} onDark={onDark} className={`h-3 ${line === lines - 1 ? 'w-2/3' : 'w-full'}`} />)}
  </div>
}

export function CategoryTabsSkeleton() {
  return <div className="mb-4 flex min-h-11 gap-2 overflow-hidden lg:hidden">
    {[0, 1, 2, 3].map(tab => <SkeletonBlock key={tab} rounded={false} className="h-11 w-16 shrink-0 rounded-full" />)}
  </div>
}

function MetaSkeleton({ compact = false }) {
  return <div className={`flex flex-wrap ${compact ? 'gap-2' : 'gap-4'}`}><SkeletonBlock className={compact ? 'h-4 w-16' : 'h-4 w-20'} /><SkeletonBlock className="h-4 w-24" />{!compact && <SkeletonBlock className="h-4 w-20" />}</div>
}

function TabsSkeleton({ news = false }) {
  if (news) return <div className={NEWS_BOOK_TABS}>
    {[0, 1, 2, 3].map(tab => <div key={tab} className={`${NEWS_BOOK_TAB} border-transparent`}>
      <SkeletonBlock className="h-4 w-4" /><SkeletonBlock className={tab < 2 ? 'h-4 w-12 sm:h-5 sm:w-14' : 'h-4 w-6 sm:h-5 sm:w-7'} />
    </div>)}
  </div>
  return <div className="mb-6 flex gap-5 overflow-hidden border-b border-gray-200 dark:border-night-700 sm:gap-8">
    {[0, 1, 2].map(tab => <SkeletonBlock key={tab} className="mb-3 mt-1 h-5 w-20 shrink-0" />)}
  </div>
}

export function ArticleRowsSkeleton({ count, category = false }) {
  return <>
    {category && <><div className="mb-6 flex items-center gap-3"><SkeletonBlock className="h-10 w-10 rounded-full" /><div className="space-y-1"><SkeletonBlock className="h-7 w-32 md:h-9" /><SkeletonBlock className="h-5 w-24" /></div></div><CategoryTabsSkeleton /></>}
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => <article key={index} data-skeleton="article-row"
        className={`${category ? 'bg-white dark:bg-night-800 rounded-lg border' : 'bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg border-b sm:border'} border-gray-200 dark:border-night-700 overflow-hidden md:h-36`}>
        <div className={ARTICLE_ROW}>
          <SkeletonBlock rounded={false} className={ARTICLE_IMAGE} />
          <div className={`${ARTICLE_BODY} ${category ? 'pr-3' : ''} sm:justify-between`}>
            <div><SkeletonBlock className="mb-1 h-7 w-3/4" /><TextSkeleton lines={2} className="py-1" /></div>
            <div className="mt-2"><MetaSkeleton compact /></div>
          </div>
        </div>
      </article>)}
    </div>
  </>
}

export function BooksSkeleton({ count }) {
  return <div className={BOOK_COLUMNS}>
    {Array.from({ length: count }, (_, index) => <div key={index} data-skeleton="book-card" className={`${BOOK_CARD} border-gray-200 dark:border-night-700`}>
      <SkeletonBlock rounded={false} className={BOOK_COVER} />
      <div className="p-3"><SkeletonBlock className="mb-1.5 h-10 w-3/4 sm:h-[18px]" /><SkeletonBlock className="h-4 w-1/2" /></div>
    </div>)}
  </div>
}

export function DetailSkeleton({ variant = 'article' }) {
  const library = variant === 'library'
  return <article className={`${DETAIL_CARD} ${['news', 'library'].includes(variant) ? 'sm:shadow-sm' : 'sm:shadow-lg'}`} data-skeleton={variant}>
    {library ? <>
      <header className={LIBRARY_HEADER}>
        <div className="py-2 sm:py-5"><SkeletonBlock className="mb-5 h-1 w-9" /><SkeletonBlock className="h-8 w-4/5 sm:h-12" /><SkeletonBlock className="mt-6 h-6 w-24 sm:mt-8" /></div>
        <SkeletonBlock className="aspect-[2/3] max-h-64 w-full" />
      </header>
      <div className="mb-8 border-b border-gray-200 py-5 dark:border-night-700 sm:mb-10"><MetaSkeleton /></div>
    </> : variant === 'document' ? <div className="mb-5 sm:mb-6">
      <SkeletonBlock className="mb-3 h-6 w-16 rounded-full" />
      <SkeletonBlock className="h-8 w-4/5 sm:h-9" />
      <SkeletonBlock className="mt-3 h-5 w-3/5" />
    </div> : <>
      <SkeletonBlock className={`${variant === 'news' ? 'mb-4' : 'mb-6'} h-8 w-4/5 sm:h-9`} />
      <div className="mb-8 border-b border-gray-200 pb-6 dark:border-night-700"><MetaSkeleton /></div>
      {variant === 'news' && <div className={`${NEWS_BOOK_COLUMNS} mb-8`}>
        <SkeletonBlock className="aspect-[2/3] w-full sm:aspect-auto sm:min-h-40 sm:self-stretch" />
        <div className="space-y-2">{Array.from({ length: 7 }, (_, row) => <div key={row} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[4rem_minmax(0,1fr)]"><SkeletonBlock className="my-1 h-4 w-full" /><SkeletonBlock className="my-1 h-4 w-4/5" /></div>)}</div>
      </div>}
    </>}
    {variant === 'document' ? <>
      <div className="mb-2 flex items-center gap-1.5"><SkeletonBlock className="h-4 w-20" /></div>
      <div className={DOCUMENT_BLEED}><SkeletonBlock className={`w-full rounded-none ${DOCUMENT_VIEWER_HEIGHT} ${DOCUMENT_VIEWER_FRAME}`} /></div>
      <div className="mt-5 flex items-center justify-between gap-3"><SkeletonBlock className="h-10 w-40 rounded-full" /><SkeletonBlock className="h-10 w-44 rounded-full" /></div>
    </> : <>
      {['library', 'news'].includes(variant) && <TabsSkeleton news={variant === 'news'} />}
      <TextSkeleton lines={8} className="py-2" />
    </>}
  </article>
}

export function QASkeleton({ count }) {
  return <div className="space-y-4">{Array.from({ length: count }, (_, index) => <article key={index} data-skeleton="question" className={QA_CARD}>
    <div className="flex flex-wrap items-center justify-between gap-2"><SkeletonBlock className="h-5 w-36" /><SkeletonBlock className="h-6 w-20 rounded-full" /></div>
    <div className={QA_QUESTION_BODY}><SkeletonBlock className="h-7 w-4/5" /><SkeletonBlock className="mt-1 h-7 w-2/3" /></div>
    <div className={QA_ANSWER_BODY}><div><SkeletonBlock className="mb-2 h-5 w-28" /><TextSkeleton lines={3} /></div></div>
  </article>)}</div>
}

export function FeaturedBookSkeleton() {
  return <div className={HOME_FEATURED_CARD}>
    <div className={HOME_FEATURED_CONTENT}>
      <SkeletonBlock className="aspect-[2/3] w-full shrink-0 sm:w-[40%] lg:aspect-auto lg:min-h-64" />
      <div className="flex min-w-0 flex-1 flex-col"><SkeletonBlock className="mb-2 h-7 w-20" /><SkeletonBlock className="mb-2 h-8 w-3/4" /><TextSkeleton lines={5} /><TextSkeleton lines={3} className="mt-3" /></div>
    </div>
  </div>
}

export function CarouselSkeleton() {
  return <div className="relative my-4 w-full p-0"><div className="grid w-full grid-cols-2 gap-2 py-2 sm:grid-cols-5">
    {Array.from({ length: 5 }, (_, index) => <div key={index} className={`${index === 4 ? 'hidden sm:block' : ''} relative min-w-0 aspect-[2/3] sm:max-h-[240px]`}><SkeletonBlock className="h-full w-full rounded-lg" /><div className="absolute inset-x-3 bottom-3 space-y-2"><SkeletonBlock className="h-4 w-3/4" /><SkeletonBlock className="h-3 w-1/2" /></div></div>)}
  </div><div className="mt-2 flex justify-center gap-2 p-2"><SkeletonBlock className="h-1.5 w-6" /><SkeletonBlock className="h-1.5 w-2" /><SkeletonBlock className="h-1.5 w-2 sm:hidden" /></div></div>
}

export default function SkeletonContent({ kind, count, onDark }) {
  if (kind === 'auth') return <div className={AUTH_CARD}><SkeletonBlock className="h-8 w-36" /><TextSkeleton lines={2} className="mt-3" /><SkeletonBlock className="mt-6 h-5 w-14" /><SkeletonBlock className="mt-2 h-11 w-full" /><SkeletonBlock className="mt-5 h-11 w-full" /><SkeletonBlock className="mx-auto mt-3 h-11 w-40" /><SkeletonBlock className="mt-5 h-11 w-full" /><SkeletonBlock className="mt-3 h-5 w-full" /></div>
  if (kind === 'quran') return <div className={`py-4 md:p-4 ${QURAN_FRAME}`}><SkeletonBlock className="mx-auto mb-4 h-8 w-36" />{[0, 1, 2].map(row => <div key={row} className={QURAN_ROW}><SkeletonBlock className="h-4 w-4" /><div><SkeletonBlock className="ml-auto h-16 w-4/5" /><SkeletonBlock className="mt-3 h-8 w-full" /></div></div>)}</div>
  if (kind === 'list' || kind === 'reviews') return <ArticleRowsSkeleton count={count ?? 15} category={kind === 'reviews'} />
  if (kind === 'books') return <BooksSkeleton count={count ?? 16} />
  if (['article', 'news', 'library', 'document'].includes(kind)) return <DetailSkeleton variant={kind} />
  if (kind === 'qa') return <QASkeleton count={count ?? 3} />
  if (kind === 'featured-book') return <FeaturedBookSkeleton />
  if (kind === 'carousel') return <CarouselSkeleton />
  if (kind === 'tags') return <div className="flex flex-wrap gap-1.5">{[0, 1, 2, 3].map(tag => <SkeletonBlock key={tag} className="h-7 w-16" />)}</div>
  if (kind === 'daily' || kind === 'daily-feature') return <><TextSkeleton onDark={onDark} lines={6} /><TextSkeleton onDark={onDark} lines={kind === 'daily' ? 2 : 3} className="mt-4 border-t border-white/25 pt-3" /></>
  if (['recent', 'home-news', 'home-qa', 'home-category'].includes(kind)) return <div className={kind === 'recent' ? 'divide-y divide-gray-100 dark:divide-night-700' : 'space-y-2'}>
    {Array.from({ length: count ?? 5 }, (_, row) => <div key={row} className={kind === 'recent' ? SIDEBAR_ROW : 'border-b border-gray-200 pb-2 last:border-0 dark:border-night-700'}>
      <SkeletonBlock className={`${kind === 'recent' ? 'h-4 mb-1' : 'h-5 mb-1'} w-full`} />
      {kind === 'home-category' && row === 0 && <TextSkeleton lines={2} className="my-2" />}
      {kind !== 'home-qa' && <SkeletonBlock className={`${kind === 'recent' ? 'h-3' : 'h-4'} w-1/2`} />}
    </div>)}
  </div>
  if (kind === 'hadith') return <div className="space-y-4 md:space-y-6">{Array.from({ length: count ?? 3 }, (_, index) => <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-night-700 dark:bg-night-800 md:rounded-2xl md:p-6"><SkeletonBlock className="mb-3 h-6 w-16" /><TextSkeleton lines={5} /></div>)}</div>
  return <div className="space-y-3">{Array.from({ length: count ?? 3 }, (_, index) => <TextSkeleton key={index} onDark={onDark} className="py-2" />)}</div>
}
