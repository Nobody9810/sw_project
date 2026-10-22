import { NEWS_BOOK_COLUMNS } from '@/lib/contentLayout'
import ShareButtons from '@/components/common/ShareButtons'
import { articlePath } from '@/lib/articleUrl'
import CoverImage from './CoverImage'

export default function BookDetailHeader({ article, bookInfo, metaItems, onPurchase }) {

  return (
    <header className="mb-8">
      <h1 className="mb-4 text-2xl font-bold leading-snug tracking-tight text-gray-900 dark:text-night-100 sm:text-3xl break-words">
        {article.标题}
      </h1>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6 dark:border-night-700">
        <div className="flex flex-wrap items-center gap-4">
          {metaItems.map(item => {
            const Icon = item.icon
            return <span key={item.label} className="flex items-center gap-2 text-sm text-gray-600 dark:text-night-400">
              <Icon className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span>{item.label}</span>
            </span>
          })}
        </div>
        <ShareButtons url={articlePath('书讯', article)} article={article} section="书讯" />
      </div>

      <div className={NEWS_BOOK_COLUMNS}>
        <div className="relative min-w-0 overflow-hidden rounded sm:min-h-40">
          <CoverImage src={article.图片} alt={`${article.标题}封面`} title={article.标题} kind="book" label="书讯" loading="eager"
            className="block h-auto w-full object-contain sm:absolute sm:inset-0 sm:h-full sm:object-cover"
            placeholderClassName="aspect-[2/3] w-full sm:absolute sm:inset-0 sm:h-full sm:aspect-auto" />
        </div>

        <div className="min-w-0">
          <dl className="space-y-2 text-sm leading-6">
            {bookInfo.map(info => (
              <div key={info.label} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[4rem_minmax(0,1fr)]">
                <dt className="text-gray-500 dark:text-night-400">{info.label}</dt>
                <dd className={`min-w-0 break-words ${info.label === '作者' ? 'font-medium text-green-700 dark:text-sage-400' : 'text-gray-800 dark:text-night-200'}`}>
                  {info.value}
                </dd>
              </div>
            ))}
          </dl>

          {article.sale_info?.is_active && (
            <button type="button" onClick={onPurchase}
              className="mt-5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
              购书咨询
            </button>
          )}
        </div>
      </div>

    </header>
  )
}
