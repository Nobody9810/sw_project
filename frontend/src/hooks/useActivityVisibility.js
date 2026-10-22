import { useEffect, useState } from 'react'

// Reveal a secondary control during interaction, without tracking pointer movement.
export default function useActivityVisibility(enabled, idleMs = 1800) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    if (!enabled) return
    let timer
    const reveal = () => {
      setVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setVisible(false), idleMs)
    }
    window.addEventListener('wheel', reveal, { passive: true })
    window.addEventListener('scroll', reveal, { passive: true })
    document.addEventListener('click', reveal)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('wheel', reveal)
      window.removeEventListener('scroll', reveal)
      document.removeEventListener('click', reveal)
    }
  }, [enabled, idleMs])

  return enabled && visible
}
