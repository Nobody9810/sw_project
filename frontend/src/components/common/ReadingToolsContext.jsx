import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ReadingToolsContext = createContext(null)

export function ReadingToolsProvider({ children }) {
  const [scope, setScope] = useState(null)
  const value = useMemo(() => ({ scope, setScope }), [scope])
  return <ReadingToolsContext.Provider value={value}>{children}</ReadingToolsContext.Provider>
}

export function useReadingToolsScope() {
  return useContext(ReadingToolsContext)?.scope || null
}

// Reading inside the 经训 page changes locally, without a new URL.
export function useReportReadingToolsScope(scope) {
  const setScope = useContext(ReadingToolsContext)?.setScope
  useEffect(() => {
    setScope?.(scope)
    return () => setScope?.(null)
  }, [scope, setScope])
}
