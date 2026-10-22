import { createContext, useContext, useEffect } from 'react'
import { useRouter } from 'next/router'

export const PageLoadContext = createContext(null)

// Only primary page data participates. Sidebars, comments and PDFs stay local.
export function usePageReady(loading) {
  const transition = useContext(PageLoadContext)
  const { asPath } = useRouter()
  const pending = transition?.pending
  const ready = transition?.ready
  useEffect(() => {
    if (!loading) ready?.(asPath)
  }, [loading, asPath, pending, ready])
}
