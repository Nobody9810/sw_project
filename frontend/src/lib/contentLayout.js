// Geometry shared by real pages and their loading placeholders.
export const UPDATES_FRAME = 'mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8'
export const UPDATES_CARD = 'rounded-xl border border-gray-200 bg-white p-4 dark:border-night-700 dark:bg-night-800 sm:p-6'
export const LIST_FRAME = 'w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 mt-6'
export const DETAIL_FRAME = 'w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-8'
export const CONTENT_COLUMNS = 'grid grid-cols-1 gap-6 lg:gap-8'
export const BOOK_COLUMNS = 'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4'
export const BOOK_CARD = 'flex h-full flex-col overflow-hidden rounded-xl border bg-white dark:bg-night-800 sm:rounded-lg'
export const ARTICLE_ROW = 'flex min-h-32 flex-row sm:min-h-0 sm:h-36 md:h-full'
export const ARTICLE_IMAGE = 'relative mt-3 h-24 w-24 shrink-0 self-start overflow-hidden rounded-lg sm:mt-0 sm:self-center sm:h-32 sm:w-32 md:h-full md:w-1/4 md:rounded-none'
export const ARTICLE_BODY = 'min-w-0 flex-1 py-3 pl-3 pr-0 sm:p-3 md:w-3/4 flex flex-col'
export const BOOK_COVER = 'relative aspect-[2/3] overflow-hidden border-b border-gray-200 dark:border-night-700 sm:aspect-auto sm:h-56'
export const LIST_HEADING = 'mb-4 flex min-h-11 items-center justify-between gap-3 lg:hidden'
// Phones read the Quran directly on the page; the card frame starts with the desktop directory (768px).
export const QURAN_FRAME = 'md:overflow-hidden md:rounded-xl md:border md:border-gray-200 md:bg-white md:dark:border-night-700 md:dark:bg-night-800'
export const QURAN_GUTTER = 'md:px-6'
export const QURAN_ROW = 'grid w-full min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 rounded-lg py-5 text-left sm:py-6'
// 古籍/论文: the reader spans the card edge to edge (cancelling DETAIL_CARD padding); shared with the skeleton.
export const DOCUMENT_BLEED = '-mx-4 sm:-mx-6 md:-mx-8'
export const DOCUMENT_VIEWER_FRAME = 'border-y border-gray-200 dark:border-night-700'
// Phones size the reader to a portrait page instead of 75vh of mostly empty space.
export const DOCUMENT_VIEWER_HEIGHT = 'h-[min(75vh,135vw)] min-h-[400px] sm:h-[75vh] sm:min-h-[560px]'
export const DETAIL_CARD = 'bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-xl shadow-none border-none sm:border sm:border-gray-200 sm:dark:border-night-700 p-4 sm:p-6 md:p-8 mb-6'
export const NEWS_BOOK_COLUMNS = 'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-stretch sm:gap-8'
export const NEWS_BOOK_TABS = 'mb-6 grid grid-cols-4 border-b border-gray-200 dark:border-night-700 sm:flex sm:gap-8'
export const NEWS_BOOK_TAB = 'inline-flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap border-b-2 px-0.5 pb-3 pt-1 text-xs sm:min-h-0 sm:shrink-0 sm:flex-row sm:gap-2 sm:px-1 sm:text-sm'
export const LIBRARY_HEADER = 'grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-6 py-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-10 sm:py-6'
export const HOME_FEATURED_CARD = 'bg-transparent sm:bg-white sm:dark:bg-night-800 rounded-none sm:rounded-lg shadow-none sm:shadow-lg border-none sm:border border-gray-200 dark:border-night-700 p-0 sm:p-4 h-full flex flex-col lg:flex-1'
export const HOME_FEATURED_CONTENT = 'flex flex-col sm:flex-row items-stretch gap-3 lg:flex-1'
export const QA_FRAME = `${LIST_FRAME} pb-8`
export const QA_HEADER = 'mb-6 border-b border-gray-200 pb-5 dark:border-night-700'
export const QA_COLUMNS = 'grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8'
export const QA_CARD = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-night-700 dark:bg-night-800 sm:p-5'
export const QA_FORM_BODY = 'p-4'
export const QA_QUESTION_BODY = 'mt-4 whitespace-pre-wrap break-words text-base font-medium leading-7 text-gray-900 dark:text-night-100'
export const QA_ANSWER_BODY = 'mt-5 space-y-5 border-t border-gray-100 pt-5 dark:border-night-700'

export const SIDEBAR_HEADER = 'px-3 py-2.5'
export const SIDEBAR_BODY = 'p-3'
export const SIDEBAR_LIST_BODY = 'px-3 py-0.5'
export const SIDEBAR_ROW = 'py-2'
export const SIDEBAR_ARTICLE_TITLE = 'm-0 mb-1 line-clamp-2 text-xs font-bold leading-[1.4] text-[#333] transition-colors group-hover:text-green-700 dark:text-night-200 dark:group-hover:text-sage-400'
export const SIDEBAR_DATE = 'text-xs font-normal text-[#999] dark:text-night-400'

export const bookTypes = new Set(['书讯', '论文', '古籍', '书库'])

export const AUTH_FRAME = 'mx-auto w-full max-w-md py-8 sm:py-12'
export const AUTH_CARD = 'rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-800 sm:p-8'

// Prayer time page and its route/region skeleton.
export const PRAYER_FRAME = 'mx-auto w-full max-w-5xl py-6 sm:px-6 sm:py-8 lg:px-8'
export const PRAYER_CARD = 'rounded-xl border border-gray-200 bg-white p-4 dark:border-night-700 dark:bg-night-800 sm:p-6'
export const PRAYER_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-5'
export const PRAYER_TILE = 'min-w-0 rounded-xl border p-4 sm:px-3 sm:py-5'
