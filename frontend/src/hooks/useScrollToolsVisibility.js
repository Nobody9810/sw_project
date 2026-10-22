import { useEffect, useState } from 'react'

// Scroll direction is based on document movement, never a drawer's internal scroll.
export default function useScrollToolsVisibility(toolsRef, resetKey, forceVisible = false) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    setHidden(false)
    const tools = toolsRef.current
    if (!tools) return
    const mobile = window.matchMedia('(max-width: 1023px)')
    let previous = Math.max(0, window.scrollY || 0), distance = 0, direction = 0, frame = null, keyboard = false
    const reveal = () => { distance = 0; direction = 0; previous = Math.max(0, window.scrollY || 0); setHidden(false) }
    const measure = () => {
      frame = null
      const position = Math.max(0, window.scrollY || 0)
      const delta = position - previous
      previous = position
      if (!mobile.matches || forceVisible || position <= 24 || (keyboard && tools.contains(document.activeElement))) {
        reveal(); return
      }
      if (!delta) return
      const nextDirection = Math.sign(delta)
      distance = nextDirection === direction ? distance + Math.abs(delta) : Math.abs(delta)
      direction = nextDirection
      if (distance >= 12) { setHidden(direction > 0); distance = 0 }
    }
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(measure) }
    const key = event => { if (event.key === 'Tab') { keyboard = true; reveal() } }
    const pointer = () => { keyboard = false }
    const stop = () => {
      if (frame !== null) { cancelAnimationFrame(frame); frame = null }
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', pointer)
    }
    const update = () => {
      stop()
      reveal()
      if (!mobile.matches) return
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('keydown', key)
      window.addEventListener('pointerdown', pointer, { passive: true })
    }
    mobile.addEventListener('change', update)
    update()
    return () => { stop(); mobile.removeEventListener('change', update) }
  }, [toolsRef, resetKey, forceVisible])
  return hidden
}
