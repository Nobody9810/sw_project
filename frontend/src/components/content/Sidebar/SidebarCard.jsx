import { useId } from 'react'
import { SIDEBAR_HEADER, SIDEBAR_BODY } from '@/lib/contentLayout'

export default function SidebarCard({ title, icon: Icon, action, children, className = '', bodyClassName = SIDEBAR_BODY, compact = true, titleClassName, tone = 'default' }) {
  const id = useId()
  const onDark = tone === 'feature'
  const surface = onDark
    ? 'border-green-500 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md dark:border-sage-600 dark:from-sage-600 dark:to-sage-700'
    : tone === 'daily'
      ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-sage-800 dark:from-sage-950 dark:to-sage-950'
      : 'border-gray-200 bg-white dark:border-night-700 dark:bg-night-800'
  return (
    <section aria-labelledby={id} className={`overflow-hidden rounded-xl border ${surface} ${className}`}>
      <header className={`flex items-center justify-between gap-3 border-b ${compact ? SIDEBAR_HEADER : 'px-4 py-3'} ${onDark ? 'border-white/20' : tone === 'daily' ? 'border-green-200/70 dark:border-sage-800' : 'border-gray-100 dark:border-night-700'}`}>
        <h2 id={id} className={`m-0 flex items-center gap-2 ${titleClassName || 'text-sm font-bold'} ${onDark ? 'text-white' : 'text-[#333] dark:text-night-100'}`}>
          {Icon && <Icon className={`h-5 w-5 shrink-0 ${onDark ? 'text-white' : 'text-green-700 dark:text-sage-400'}`} aria-hidden="true" />}
          {title}
        </h2>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
