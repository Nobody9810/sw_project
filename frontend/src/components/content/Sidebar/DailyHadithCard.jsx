import { SIDEBAR_BODY } from '@/lib/contentLayout'
import { Sparkles, ArrowRight, RotateCcw } from 'lucide-react'
import { Link } from '@/lib/navigation'
import useDailyHadith from '@/hooks/useDailyHadith'
import HadithText from '../HadithText'
import HadithNotes from '../HadithNotes'
import HadithOriginalNumber from '../HadithOriginalNumber'
import SidebarCard from './SidebarCard'
import LoadingState from '@/components/common/LoadingState'
import { hadithChapterPath } from '@/features/content/data/hadithNavigation'

export default function DailyHadithCard({ variant = 'sidebar', onNavigate }) {
  const { data, status, retry } = useDailyHadith()
  const feature = variant === 'feature'
  const body = data?.body ?? data?.text ?? ''
  const chapterPath = hadithChapterPath(data)

  return (
    <SidebarCard title="今日圣训" icon={Sparkles} tone="feature" compact={!feature} titleClassName={feature ? 'text-lg font-bold' : undefined} bodyClassName={feature ? 'p-5 sm:p-6' : SIDEBAR_BODY}
      action={feature
        ? null
        : <Link href="/经训" onClick={onNavigate} className="inline-flex shrink-0 items-center gap-1 rounded text-xs text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          前往经训<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>}>
      {status === 'loading' ? <LoadingState kind={feature ? 'daily-feature' : 'daily'} label="正在加载今日圣训…" onDark /> : status === 'error' ? <div role="alert" className="text-sm text-white/90">
        <p>今日圣训暂时无法加载</p>
        <button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-1.5 rounded text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />重新加载
        </button>
      </div> : data ? <>
        <HadithText text={body} className={`text-white ${feature ? 'text-base leading-8 sm:text-lg' : 'text-xs leading-6'}`} />
        {feature && <HadithNotes notes={data.notes} onDark />}
        <div className="mt-4 border-t border-white/25 pt-3 text-xs leading-6 text-white/80">
          <p className="font-medium text-white">{data.collection_name || '圣训集'}</p>
          {data.chapter && <p>{chapterPath
            ? <Link href={chapterPath} scroll={false} onClick={onNavigate} aria-label={`阅读${data.collection_name || '圣训集'} · ${data.chapter}`} className="rounded underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{data.chapter}</Link>
            : data.chapter}</p>}
          {feature && <p><HadithOriginalNumber originalNumber={data.original_number} /></p>}
        </div>
      </> : <p className="text-sm leading-6 text-white/90">暂无可展示的圣训</p>}
    </SidebarCard>
  )
}
