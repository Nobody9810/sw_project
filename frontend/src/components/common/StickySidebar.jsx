import { useEffect, useRef, useState } from 'react'

export function useSidebarOffset(sidebarRef) {
  const [top, setTop] = useState(80)

  useEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar) return
    // Long sidebars scroll with the page until their bottom fits the viewport.
    // Observe content changes as categories and recommendations load.
    const updateTop = () => setTop(Math.min(80, window.innerHeight - sidebar.getBoundingClientRect().height - 24))
    updateTop()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateTop)
    observer?.observe(sidebar)
    window.addEventListener('resize', updateTop)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateTop)
    }
  }, [sidebarRef])

  return top
}

export default function StickySidebar({ children, className = '', ...props }) {
  const sidebarRef = useRef(null)
  const top = useSidebarOffset(sidebarRef)

  return (
    <aside {...props} ref={sidebarRef} style={{ '--sidebar-top': `${top}px` }}
      className={`min-w-0 lg:sticky lg:top-[var(--sidebar-top,5rem)] lg:self-start ${className}`}>
      {children}
    </aside>
  )
}
