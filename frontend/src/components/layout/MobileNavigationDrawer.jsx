import AccountEntry from '@/features/auth/AccountEntry'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useLocation } from '@/lib/navigation'
import useMobileDrawer from '@/hooks/useMobileDrawer'
import SiteSearchForm from '@/components/common/SiteSearchForm'
import MobileNavigationLinks from './MobileNavigationLinks'

export default function MobileNavigationDrawer({ open, onClose, triggerRef }) {
  const { pathname } = useLocation()
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  useMobileDrawer({ open, onClose, panelRef, triggerRef, initialFocusRef: closeRef })
  useEffect(() => { onClose() }, [pathname, onClose])

  // Outside the shortcut stack so its stacking context cannot cover the dialog.
  return <div className="relative z-[60] lg:hidden">
    {open && <div className="fixed inset-0 bg-black/[0.35]" onClick={onClose} aria-hidden="true" />}
    <div ref={panelRef} id="navbarNavMobile" role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined} aria-label="网站导航" inert={!open} tabIndex={-1}
      className={`fixed inset-x-0 bottom-0 mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none dark:border-night-700 dark:bg-night-800 sm:inset-x-auto sm:max-w-sm sm:bottom-4 sm:right-4 sm:rounded-xl ${open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[calc(100%+1rem)] opacity-0'}`}>
      <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-night-100">导航</h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="关闭菜单"
          className="-mr-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-night-400 dark:hover:bg-night-700 dark:hover:text-night-100">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <SiteSearchForm className="shrink-0 px-4 pb-3" onSubmitted={onClose} />
      <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-gray-100 px-3 py-3 dark:border-night-700">
        <nav aria-label="网站栏目"><MobileNavigationLinks pathname={pathname} onNavigate={onClose} /></nav>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-2 dark:border-night-700"><AccountEntry text active={open} onNavigate={onClose} className="inline-flex min-h-11 items-center gap-2 text-sm text-green-700 dark:text-sage-400" /></div>
    </div>
  </div>
}
