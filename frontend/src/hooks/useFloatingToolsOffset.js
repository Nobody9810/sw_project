import { useEffect, useState } from 'react'

// Keep phone shortcuts above visible reading controls, using their actual size.
export default function useFloatingToolsOffset(toolsRef) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const tools = toolsRef.current
    if (!tools) return
    const mobile = window.matchMedia('(max-width: 1023px)')
    let stopWatching = () => {}

    const watchMobile = () => {
      let frame = null
      let docks = []
      const measure = () => {
        frame = null
        const rect = tools.getBoundingClientRect()
        const viewportHeight = window.visualViewport?.height || window.innerHeight
        const applied = parseFloat(tools.style.getPropertyValue('--floating-tools-offset')) || 0
        const base = Math.max(0, (parseFloat(window.getComputedStyle(tools).bottom) || 16) - applied)
        let bottom = base
        const obstacles = docks.map(dock => dock.getBoundingClientRect())
          .filter(dock => dock.width > 0 && dock.height > 0 && dock.bottom > 0 && dock.top < viewportHeight
            && dock.right > rect.left && dock.left < rect.right)
          .sort((a, b) => b.top - a.top)
        for (const dock of obstacles) {
          if (dock.top < viewportHeight - bottom && dock.bottom > viewportHeight - bottom - rect.height) {
            bottom = viewportHeight - dock.top + 12
          }
        }
        const maximum = Math.max(base, viewportHeight - rect.height - 8)
        setOffset(Math.max(0, Math.min(bottom, maximum) - base))
      }
      const schedule = () => { if (frame === null) frame = requestAnimationFrame(measure) }
      const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
      const refresh = () => {
        const next = Array.from(document.querySelectorAll('[data-reader-dock]'))
        for (const dock of docks) if (!next.includes(dock)) resize?.unobserve(dock)
        for (const dock of next) if (!docks.includes(dock)) resize?.observe(dock)
        docks = next
        schedule()
      }
      const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(refresh)
      resize?.observe(tools)
      mutation?.observe(document.body, { childList: true, subtree: true })
      window.addEventListener('scroll', schedule, { passive: true, capture: true })
      window.addEventListener('resize', schedule)
      window.visualViewport?.addEventListener('resize', schedule)
      window.visualViewport?.addEventListener('scroll', schedule)
      refresh()
      return () => {
        if (frame !== null) cancelAnimationFrame(frame)
        resize?.disconnect()
        mutation?.disconnect()
        window.removeEventListener('scroll', schedule, true)
        window.removeEventListener('resize', schedule)
        window.visualViewport?.removeEventListener('resize', schedule)
        window.visualViewport?.removeEventListener('scroll', schedule)
      }
    }
    const update = () => {
      stopWatching()
      stopWatching = mobile.matches ? watchMobile() : () => {}
      if (!mobile.matches) setOffset(0)
    }
    mobile.addEventListener('change', update)
    update()
    return () => { mobile.removeEventListener('change', update); stopWatching() }
  }, [toolsRef])

  return offset
}
