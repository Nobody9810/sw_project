import { useEffect, useState } from 'react'

// Detect a failed webfont instead of silently presenting a fallback as the intended script.
export default function useQuranFont(family, enabled = true) {
  const [state, setState] = useState({ family: '', status: 'idle' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled || !document.fonts) return
    let active = true
    setState({ family, status: 'loading' })
    const timer = setTimeout(() => {
      if (active) setState({ family, status: 'error' })
    }, 15000)
    document.fonts.load(`30px "${family}"`, 'بِسۡمِ').then(faces => {
      if (active) {
        clearTimeout(timer)
        setState({ family, status: faces.length ? 'ready' : 'error' })
      }
    }).catch(() => {
      if (active) {
        clearTimeout(timer)
        setState({ family, status: 'error' })
      }
    })
    return () => { active = false; clearTimeout(timer) }
  }, [family, enabled, attempt])
  return { status: enabled && state.family === family ? state.status : 'idle', retry: () => setAttempt(value => value + 1) }
}
