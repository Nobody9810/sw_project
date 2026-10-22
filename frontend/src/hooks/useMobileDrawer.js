import { useEffect, useRef } from 'react'

const drawers = new Set()
let previousOverflow = ''
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Shared interaction only: each page retains its own drawer styling and breakpoint.
export default function useMobileDrawer({ open, onClose, panelRef, triggerRef, initialFocusRef, desktopWidth = 1024 }) {
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    if (window.innerWidth >= desktopWidth) { closeRef.current(); return }
    const panel = panelRef.current
    if (!panel) return
    const trigger = triggerRef.current
    const token = Symbol('drawer')
    if (drawers.size === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    drawers.add(token)
    const topmost = () => Array.from(drawers).at(-1) === token
    const controls = () => Array.from(new Set(Array.from(panel.querySelectorAll(focusableSelector)).concat(trigger)))
      .filter(element => element && element.getAttribute?.('tabindex') !== '-1' && element.getClientRects().length && !element.closest('[inert]'))
    const focusFrame = requestAnimationFrame(() => {
      if (topmost()) (initialFocusRef?.current || controls()[0] || panel).focus({ preventScroll: true })
    })
    const handleKey = event => {
      if (!topmost()) return
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const elements = controls()
      const index = elements.indexOf(document.activeElement)
      if (!elements.length) { event.preventDefault(); panel.focus({ preventScroll: true }); return }
      if (index < 0 || (event.shiftKey && index === 0) || (!event.shiftKey && index === elements.length - 1)) {
        event.preventDefault()
        elements[event.shiftKey ? elements.length - 1 : 0].focus({ preventScroll: true })
      }
    }
    const resize = () => { if (window.innerWidth >= desktopWidth) closeRef.current() }
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', resize)
      const wasTopmost = topmost()
      drawers.delete(token)
      if (drawers.size === 0) document.body.style.overflow = previousOverflow
      if (wasTopmost && window.innerWidth < desktopWidth && trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [open, panelRef, triggerRef, initialFocusRef, desktopWidth])
}
