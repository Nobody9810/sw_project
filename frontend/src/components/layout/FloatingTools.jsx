import { usePrayerTools } from '@/features/prayers/PrayerToolsContext'
import { useCallback, useRef, useState } from 'react'
import { Menu, MessageSquare, Wrench } from 'lucide-react'
import { useLocation } from '@/lib/navigation'
import { useReadingToolsScope } from '@/components/common/ReadingToolsContext'
import ThemeToggle from '@/components/common/ThemeToggle'
import FeedbackDialog from './FeedbackDialog'
import MobileNavigationDrawer from './MobileNavigationDrawer'
import styles from './FloatingTools.module.css'
import useFloatingToolsOffset from '@/hooks/useFloatingToolsOffset'
import useScrollToolsVisibility from '@/hooks/useScrollToolsVisibility'

const actionClass = `inline-flex h-11 items-center rounded-xl bg-white text-sm text-green-700 shadow-md ring-1 ring-inset ring-gray-200 transition-[background-color,box-shadow] hover:bg-green-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:bg-night-800 dark:text-sage-400 dark:ring-night-700 dark:hover:bg-night-700 dark:focus-visible:ring-sage-400 ${styles.action}`

export default function FloatingTools() {
  const prayers = usePrayerTools()
  const { pathname } = useLocation()
  const localScope = useReadingToolsScope()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationTrigger = useRef(null)
  const closeNavigation = useCallback(() => setNavigationOpen(false), [])
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const feedbackTrigger = useRef(null)
  const toolsRef = useRef(null)
  const bottomOffset = useFloatingToolsOffset(toolsRef)
  const hidden = useScrollToolsVisibility(toolsRef, `${pathname}:${localScope || ''}`, navigationOpen || feedbackOpen || Boolean(prayers?.toolsOpen))
  const closeFeedback = useCallback(() => setFeedbackOpen(false), [])
  // Keep actions together so later tools and expanded labels share one entry point.
  const tools = [
    { id: 'navigation', mobile: true, element: <button ref={navigationTrigger} type="button" aria-label="打开菜单"
      aria-expanded={navigationOpen} aria-controls="navbarNavMobile" aria-haspopup="dialog"
      onClick={() => setNavigationOpen(true)} className={actionClass}>
      <span className={styles.label} aria-hidden="true">导航</span>
      <span className={styles.icon}><Menu className="h-6 w-6" aria-hidden="true" /></span>
    </button> },
    { id: 'tools', element: <button type="button" aria-label="工具" aria-haspopup="dialog" aria-controls="site-tools-dialog" aria-expanded={Boolean(prayers?.toolsOpen)} onClick={event => prayers?.openTools(event.currentTarget)} className={actionClass}>
      <span className={styles.label} aria-hidden="true">工具</span>
      <span className={styles.icon}><Wrench className="h-[18px] w-[18px]" aria-hidden="true" /></span>
    </button> },
    { id: 'theme', element: <ThemeToggle className={actionClass} iconClassName={styles.icon} title=""><span className={styles.label} aria-hidden="true">切换背景</span></ThemeToggle> },
    { id: 'feedback', element: <button ref={feedbackTrigger} type="button" aria-label="意见反馈" aria-haspopup="dialog" onClick={() => setFeedbackOpen(true)} className={actionClass}>
      <span className={styles.label} aria-hidden="true">意见反馈</span>
      <span className={styles.icon}><MessageSquare className="h-[18px] w-[18px]" aria-hidden="true" /></span>
    </button> },
  ]

  return <>
    <aside ref={toolsRef} aria-label="页面快捷工具" style={{ '--floating-tools-offset': `${bottomOffset}px` }} className={`fixed z-30 ${styles.dock}`} data-scroll-hidden={hidden}>
      <div id="floating-page-tools">
      <ul className="flex flex-row gap-2 lg:flex-col">
        {tools.map(tool => <li key={tool.id} className={`relative h-11 w-11 ${tool.mobile ? 'lg:hidden' : ''}`}>{tool.element}</li>)}
      </ul>
      </div>

    </aside>
    <MobileNavigationDrawer open={navigationOpen} onClose={closeNavigation} triggerRef={navigationTrigger} />
    {feedbackOpen && <FeedbackDialog onClose={closeFeedback} triggerRef={feedbackTrigger} />}
  </>
}
