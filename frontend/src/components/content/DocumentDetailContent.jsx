import { BookOpen, GraduationCap, ScrollText } from 'lucide-react'
import DFlipViewer from '@/components/pdf/DFlipViewer'
import RichText from '@/components/content/RichText'
import { DOCUMENT_BLEED, DOCUMENT_VIEWER_FRAME, DOCUMENT_VIEWER_HEIGHT } from '@/lib/contentLayout'

// 古籍 / 论文 detail: a compact title block, then the document reader across the whole card.
export default function DocumentDetailContent({ type, article, metaItems, sections }) {
  const Badge = type === '论文' ? GraduationCap : ScrollText
  return <>
    <header className="mb-5 sm:mb-6">
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-sage-900/30 dark:text-sage-300">
        <Badge className="h-3.5 w-3.5" aria-hidden="true" />{type}
      </p>
      <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-night-100 md:text-3xl">{article.标题}</h1>
      {metaItems.length > 0 && <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-500 dark:text-night-400">
        {metaItems.map((item, index) => {
          const Icon = item.icon
          return <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 && <span className="mr-1.5 hidden h-1 w-1 rounded-full bg-gray-300 dark:bg-night-600 sm:inline-block" aria-hidden="true" />}
            <Icon className="h-4 w-4 text-gray-400 dark:text-night-500" aria-hidden="true" />{item.label}
          </li>
        })}
      </ul>}
    </header>

    {sections.map(section => <section key={section.key} className="mb-8">
      {section.title && <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-night-100">{section.title}</h2>}
      <RichText html={section.value} />
    </section>)}

    {article.文档 && <section aria-labelledby="document-reader" className="mb-5">
      <h2 id="document-reader" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-night-200">
        <BookOpen className="h-4 w-4 text-green-700 dark:text-sage-400" aria-hidden="true" />在线阅读
      </h2>
      <div className={DOCUMENT_BLEED}>
        <DFlipViewer fileUrl={article.文档} frameClassName={DOCUMENT_VIEWER_FRAME} heightClassName={DOCUMENT_VIEWER_HEIGHT} />
      </div>
    </section>}
  </>
}
