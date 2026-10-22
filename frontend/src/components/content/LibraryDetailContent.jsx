import { LIBRARY_HEADER } from '@/lib/contentLayout'
import { useRef, useState } from 'react'
import { Book, BookOpen, UserCircle, ArrowRight } from 'lucide-react'
import { articlePath } from '@/lib/articleUrl'
import ShareButtons from '@/components/common/ShareButtons'
import BookContentTabs from './BookContentTabs'
import CoverImage from './CoverImage'

const TABS = [
  { key: '内容', title: '图书简介', icon: Book },
  { key: '作者简介', title: '作者简介', icon: UserCircle },
  { key: '在线阅读', title: '在线阅读', icon: BookOpen },
]

export default function LibraryDetailContent({ article, sections, metaItems }) {
  const [activeTab, setActiveTab] = useState('内容')
  const contentRef = useRef(null)
  const startReading = () => {
    setActiveTab('在线阅读')
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <header className={LIBRARY_HEADER}>
          <div className="min-w-0 py-2 sm:py-5">
            <div className="mb-5 h-1 w-9 bg-green-700 dark:bg-sage-400" aria-hidden="true" />
            <h1 className="break-words font-serif text-2xl font-bold leading-relaxed tracking-wide text-gray-900 dark:text-night-100 sm:text-4xl">{article.标题}</h1>
            {article.文档 && <button type="button" onClick={startReading}
              className="mt-6 inline-flex items-center gap-2 border-b border-green-700 pb-2 text-sm font-medium text-green-700 transition-colors hover:text-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:border-sage-400 dark:text-sage-400 dark:hover:text-sage-300 sm:mt-8">
              <BookOpen className="h-4 w-4" aria-hidden="true" />开始阅读
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>}
          </div>
          <div className="min-w-0">
            <CoverImage src={article.图片} alt={`${article.标题}封面`} title={article.标题} kind="book" label="书库" loading="eager"
              className="block max-h-64 w-full object-contain drop-shadow-lg"
              placeholderClassName="mx-auto aspect-[2/3] h-64 max-w-full rounded shadow-lg" />
          </div>
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 py-5 dark:border-night-700 sm:mb-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {metaItems.map(item => {
            const Icon = item.icon
            return <span key={item.label} className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-night-400 sm:text-sm">
              <Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />{item.label}
            </span>
          })}
        </div>
        <ShareButtons url={articlePath('书库', article)} article={article} section="书库" />
      </div>

      <div ref={contentRef} className="scroll-mt-24">
        <BookContentTabs sections={sections} tabs={TABS} variant="library"
          activeTab={activeTab} onTabChange={setActiveTab} fileUrl={article.文档} />
      </div>
    </>
  )
}
