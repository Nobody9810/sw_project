import { BookOpen, History, Library, ArrowUpRight } from 'lucide-react';
import HadithText from './HadithText';

const bibliographyFields = [
  ['author', '作者／辑录者'], ['translator', '译者'], ['publisher', '出版社'],
  ['publication_date', '出版时间'], ['isbn', 'ISBN'],
];

export default function HadithCollectionIntro({ collection }) {
  if (!collection) return null;
  const bibliography = collection.bibliography || {};
  const historySource = /^https?:\/\//i.test(collection.history_source || '') ? collection.history_source : null;
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-night-700 dark:bg-night-800">
      <header className="border-b border-gray-200 p-5 dark:border-night-700 md:p-8">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-sage-400">
          <BookOpen className="h-4 w-4" aria-hidden="true" />圣训集介绍
        </div>
        <h1 className="text-2xl font-bold leading-relaxed text-gray-900 dark:text-night-100 md:text-3xl">{collection.name}</h1>
        <p className="mt-4 text-sm text-gray-500 dark:text-night-400">实际正文条数：{collection.total_hadiths || 0}</p>
        {collection.introduction && <HadithText text={collection.introduction} className="mt-5 text-base leading-8 text-gray-700 dark:text-night-300" />}
      </header>
      <div className="space-y-8 p-5 md:p-8">
        <section aria-label="版本与出版信息">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-night-100">
            <Library className="h-5 w-5 text-green-600 dark:text-sage-400" aria-hidden="true" />版本与出版信息
          </h2>
          <h3 className="mb-2 text-xs text-gray-500 dark:text-night-400">本站采用版本</h3>
          <p className="mb-5 rounded-lg bg-green-50 p-4 text-sm leading-7 text-green-900 dark:bg-sage-900/20 dark:text-sage-200">
            {bibliography.source_version || '本站采用版本信息待补充'}
          </p>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {bibliographyFields.map(([field, label]) => (
              <div key={field}>
                <dt className="mb-1 text-xs text-gray-500 dark:text-night-400">{label}</dt>
                <dd className={`whitespace-pre-line text-sm leading-7 ${bibliography[field] ? 'text-gray-800 dark:text-night-200' : 'text-gray-400 dark:text-night-500'}`}>
                  {bibliography[field] || '待补充'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-label="圣训集历史" className="border-t border-gray-200 pt-6 dark:border-night-700">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-night-100">
            <History className="h-5 w-5 text-green-600 dark:text-sage-400" aria-hidden="true" />圣训集历史
          </h2>
          <HadithText text={collection.history || '历史介绍待补充。'} className="text-base leading-8 text-gray-700 dark:text-night-300" />
          {historySource && <a href={historySource} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-green-700 hover:underline dark:text-sage-400">历史介绍参考来源<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>}
        </section>
        <p className="border-t border-gray-100 pt-5 text-sm text-gray-500 dark:border-night-700 dark:text-night-400">从目录选择篇章开始阅读，也可以在上方搜索本书全部篇章。</p>
      </div>
    </article>
  );
}
