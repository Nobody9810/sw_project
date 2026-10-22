import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { Sparkles, X } from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { usePrayerTools } from '@/features/prayers/PrayerToolsContext'
import RichText from '@/components/content/RichText'
import { formatDateToChinese } from '@/lib/dateFormatter'
import { fetchReleaseNotice, releaseNoticeStore, releaseSeenKey } from './releaseNoticeStore'

export function ReleaseDialog({ release, onClose }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  return <dialog ref={dialogRef} aria-labelledby="release-dialog-title" aria-describedby="release-dialog-summary"
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-950/50 backdrop:backdrop-blur-sm dark:border-night-700 dark:bg-night-800 dark:text-night-100">
    <div className="flex max-h-[85dvh] flex-col">
      <header className="flex shrink-0 items-start gap-3 border-b border-gray-200 px-4 py-3 dark:border-night-700 sm:px-6">
        <Sparkles size={20} className="mt-3 shrink-0 text-green-700 dark:text-sage-400" aria-hidden="true" />
        <div className="min-w-0 flex-1 py-2"><p className="mb-1 text-xs text-gray-500 dark:text-night-300">{release.version} · {formatDateToChinese(release.published_at)}</p><h2 id="release-dialog-title" className="break-words text-lg font-semibold">{release.title}</h2></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="关闭更新提醒" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-green-600 dark:text-night-300 dark:hover:bg-night-700"><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" onClick={event => { if (event.target.closest('a[href]')) onClose() }}>
        <p id="release-dialog-summary" className="mb-5 text-sm leading-7 text-gray-600 dark:text-night-300">{release.summary}</p>
        <RichText html={release.content} />
      </div>
      <footer className="flex shrink-0 justify-end border-t border-gray-200 px-4 py-3 dark:border-night-700 sm:px-6"><button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-green-700 px-5 text-sm font-medium text-white hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">知道了</button></footer>
    </div>
  </dialog>
}

export default function ReleaseNotice() {
  const router = useRouter()
  const prayers = usePrayerTools()
  const [release, setRelease] = useState(null)
  const onUpdates = Array.isArray(router.query.path) && router.query.path[0] === '更新说明'
  const visible = Boolean(release && !onUpdates && !prayers?.locationNoticeOpen && !prayers?.toolsOpen)

  useEffect(() => {
    const controller = new AbortController()
    fetchReleaseNotice(apiClient, controller.signal).then(note => {
      if (!controller.signal.aborted && note) setRelease(note)
    }).catch(() => { /* Optional notice must never block normal reading. */ })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (onUpdates && release) {
      releaseNoticeStore.mark(release.version)
      setRelease(null)
    }
  }, [onUpdates, release])

  useEffect(() => {
    const sync = event => {
      if (release && event.key === releaseSeenKey(release.version) && event.newValue === '1') setRelease(null)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [release])

  if (!visible) return null
  const dismiss = () => { releaseNoticeStore.mark(release.version); setRelease(null) }
  return <ReleaseDialog release={release} onClose={dismiss} />
}
