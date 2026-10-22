import { useEffect, useId, useRef, useState } from 'react'
import { ChevronRight, Loader2, LogOut, UserRound } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { useRouter } from 'next/router'
import apiClient from '@/lib/apiClient'
import { safeReturnPath } from './authApi'
import { useAuth } from './AuthContext'
import Avatar from './Avatar'

const actionClass = 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-night-300 dark:hover:bg-night-700'

export default function AccountEntry({ className = '', onNavigate, text = false, active = true }) {
  const { user, refresh } = useAuth()
  const { asPath, events } = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const root = useRef(null)
  const trigger = useRef(null)
  const firstAction = useRef(null)
  const request = useRef(null)
  const writing = useRef(false)
  const panelId = useId()
  const expanded = Boolean(open && user && active)
  const href = `/登录?next=${encodeURIComponent(safeReturnPath(asPath))}`

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { if (!active || !user) setOpen(false) }, [active, user])
  useEffect(() => {
    if (!expanded) return
    firstAction.current?.focus({ preventScroll: true })
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    const close = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    events?.on('routeChangeStart', close)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      events?.off('routeChangeStart', close)
    }
  }, [expanded, events])

  const signOut = async () => {
    if (writing.current) return
    const controller = new AbortController()
    request.current = controller
    writing.current = true
    setBusy(true); setError('')
    try {
      await apiClient.post('auth/logout/', {}, { signal: controller.signal })
      if (controller.signal.aborted) return
      await refresh()
      if (controller.signal.aborted) return
      setOpen(false)
      onNavigate?.()
      trigger.current?.focus({ preventScroll: true })
    } catch {
      if (!controller.signal.aborted) setError('退出未完成，请稍后重试。')
    } finally {
      if (!controller.signal.aborted) { writing.current = false; setBusy(false) }
    }
  }

  if (!user) return <Link ref={trigger} href={href} onClick={onNavigate} aria-label="登录" title="登录" className={className}>
    <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />{text && <span>登录</span>}
  </Link>

  return <div ref={root} className={`relative ${text ? 'w-full' : 'inline-flex'}`} onKeyDown={event => {
    if (expanded && event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); setOpen(false)
      trigger.current?.focus({ preventScroll: true })
    }
  }}>
    <button ref={trigger} type="button" onClick={() => setOpen(value => !value)} aria-label="我的账户" title="我的账户"
      aria-expanded={expanded} aria-controls={expanded ? panelId : undefined} className={className}>
      <Avatar avatar={user.avatar} name={user.nickname} className="h-5 w-5 text-xs ring-1 ring-black/10 dark:ring-white/20" />
      {text && <span>我的账户</span>}
    </button>
    {expanded && <div id={panelId} role="region" aria-label="账户面板"
      className={`absolute z-[70] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2 text-left text-gray-900 shadow-lg dark:border-night-700 dark:bg-night-overlay dark:text-night-100 ${text ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2'}`}>
      <div className="flex min-w-0 items-center gap-3 px-3 py-3">
        <Avatar avatar={user.avatar} name={user.nickname} className="h-10 w-10 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.nickname || '读者'}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-night-400">个人账户</p>
        </div>
      </div>
      <div className="flex items-center gap-1 border-t border-gray-100 pt-1 dark:border-night-700">
        <Link ref={firstAction} href={href} onClick={() => { setOpen(false); onNavigate?.() }} className={`${actionClass} text-green-700 dark:text-sage-400`}>
          <UserRound className="h-4 w-4" aria-hidden="true" />账户信息<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <button type="button" disabled={busy} onClick={signOut} className={`${actionClass} disabled:opacity-50`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
          {busy ? '正在退出' : '退出登录'}
        </button>
      </div>
      {error && <p role="alert" className="px-3 pb-2 pt-1 text-xs text-red-600 dark:text-red-300">{error}</p>}
    </div>}
  </div>
}
