import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { usePrayerTools } from './PrayerToolsContext'
import { PrayerTimesContent } from './PrayerTimesPage'

function Dialog({ state }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const { triggerRef } = state
  useEffect(() => {
    const dialog = dialogRef.current
    const trigger = triggerRef.current
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = previous
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [triggerRef])
  return <dialog ref={dialogRef} id="site-tools-dialog" aria-labelledby="site-tools-title" onCancel={event => { event.preventDefault(); state.closeTools() }} onClick={event => { if (event.target === event.currentTarget) state.closeTools() }} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-hidden rounded-t-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-950/50 backdrop:backdrop-blur-sm dark:border-night-700 dark:bg-night-800 dark:text-night-100 sm:inset-0 sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:rounded-xl">
    <div className="flex max-h-[90dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-night-700 sm:px-6"><h2 id="site-tools-title" className="text-base font-semibold">工具</h2><button ref={closeRef} type="button" onClick={state.closeTools} aria-label="关闭工具" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-green-600 dark:text-night-300 dark:hover:bg-night-700"><X size={20} aria-hidden="true" /></button></header>
      <div className="min-h-0 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]"><PrayerTimesContent state={state} compact /></div>
    </div>
  </dialog>
}

export default function PrayerToolsDialog() {
  const state = usePrayerTools()
  return state?.toolsOpen ? <Dialog state={state} /> : null
}
