import { useContext, useRef, useState } from 'react'
import { PageLoadContext } from '@/components/common/PageLoadContext'
import useBeforePaintEffect from './useBeforePaintEffect'

export default function useHadithTargetScroll(target, hadiths, loading) {
  const transition = useContext(PageLoadContext)
  const pending = transition?.pending
  const completed = useRef(null)
  const [highlighted, setHighlighted] = useState(null)
  useBeforePaintEffect(() => {
    setHighlighted(null)
    if (!target) { completed.current = null; return }
    if (loading || pending || completed.current === target || !hadiths.some(row => row.id === target)) return
    const element = document.getElementById(`hadith-${target}`)
    if (!element) return
    element.scrollIntoView({ behavior: 'instant', block: 'start' })
    completed.current = target
    setHighlighted(target)
    const timer = setTimeout(() => setHighlighted(null), 3000)
    return () => clearTimeout(timer)
  }, [target, hadiths, loading, pending])
  return highlighted
}
