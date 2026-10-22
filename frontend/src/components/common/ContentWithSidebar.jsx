import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ChevronDown, PanelRightClose, PanelRightOpen } from 'lucide-react'
import StickySidebar from './StickySidebar'
import { CONTENT_COLUMNS } from '@/lib/contentLayout'
import { getSidebarCollapsed, getSidebarServerSnapshot, setSidebarCollapsed, subscribeSidebar, getDesktopSnapshot, subscribeDesktop } from '@/lib/contentSidebar'
import styles from './ContentWithSidebar.module.css'
import useActivityVisibility from '@/hooks/useActivityVisibility'

export default function ContentWithSidebar({ children, sidebar, wide = false, placeholder = false, mobileCollapsible = false, mobileLabel = '更多内容' }) {
  const collapsed = useSyncExternalStore(subscribeSidebar, getSidebarCollapsed, getSidebarServerSnapshot)
  const desktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, getSidebarServerSnapshot)
  const controlVisible = useActivityVisibility(desktop && !placeholder)
  const [mobileOpen, setMobileOpen] = useState(false)
  const inactive = desktop ? collapsed : mobileCollapsible && !mobileOpen
  const panelId = useId()
  const layoutRef = useRef(null)
  const toggleRef = useRef(null)
  const panelRef = useRef(null)
  const Panel = placeholder ? 'div' : StickySidebar
  useEffect(() => {
    const layout = layoutRef.current
    if (!layout) return
    const measure = () => {
      const width = layout.getBoundingClientRect().width
      const side = wide ? (width - 64) / 3 : (width - 96) / 4
      layout.style.setProperty('--sidebar-content', `${Math.max(0, side)}px`)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(layout)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [wide])
  const toggle = () => {
    // Keep focus on the available control when the side content becomes inert.
    if (!collapsed && panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus()
    setSidebarCollapsed(!collapsed)
  }
  const sideContent = <div id={panelId} ref={panelRef} className={`${styles.clip} ${mobileCollapsible && !mobileOpen ? 'hidden lg:block' : ''}`} inert={inactive} aria-hidden={inactive ? true : undefined}>
    <div className={styles.content}>{sidebar}</div>
  </div>
  const Disclosure = placeholder ? 'div' : 'button'

  return (
    <div ref={layoutRef} className={`${CONTENT_COLUMNS} ${styles.layout} ${wide ? styles.wide : ''}`} data-sidebar-layout={wide ? '8/4' : '9/3'}>
      <div className="min-w-0">{children}</div>
      <Panel className={styles.panel}>
        {mobileCollapsible ? <>
          <Disclosure type={placeholder ? undefined : 'button'} onClick={placeholder ? undefined : () => setMobileOpen(value => !value)} aria-controls={placeholder ? undefined : panelId} aria-expanded={placeholder ? undefined : mobileOpen}
            className="mb-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-night-700 dark:bg-night-800 dark:text-night-200 lg:hidden">
            {mobileOpen ? '收起补充内容' : mobileLabel}<ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${mobileOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </Disclosure>
          {sideContent}
        </> : sideContent}
      </Panel>
      {!placeholder && <div className={styles.rail}><button ref={toggleRef} type="button" onClick={toggle} aria-controls={panelId} aria-expanded={!collapsed}
        data-visible={controlVisible}
        aria-label={collapsed ? '展开侧栏' : '收起侧栏'} title={collapsed ? '展开侧栏' : '收起侧栏'}
        className={`${styles.toggle} hidden h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:border-green-300 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-night-600 dark:bg-night-800 dark:text-night-300 dark:hover:border-sage-600 dark:hover:text-sage-400 lg:inline-flex`}>
        {collapsed ? <PanelRightOpen className="h-5 w-5" aria-hidden="true" /> : <PanelRightClose className="h-5 w-5" aria-hidden="true" />}
      </button></div>}
    </div>
  )
}
