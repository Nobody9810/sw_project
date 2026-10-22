import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import usePrayerTimes from './usePrayerTimes'
import usePrayerClock from './usePrayerClock'

const PrayerToolsContext = createContext(null)

export function PrayerToolsProvider({ children }) {
  const state = usePrayerTimes()
  const now = usePrayerClock(state.data, state.retry)
  const [toolsOpen, setToolsOpen] = useState(false)
  const triggerRef = useRef(null)
  const { asPath } = useRouter()
  const openTools = useCallback(trigger => { triggerRef.current = trigger; setToolsOpen(true) }, [])
  const closeTools = useCallback(() => setToolsOpen(false), [])
  useEffect(() => { setToolsOpen(false) }, [asPath])
  return <PrayerToolsContext.Provider value={{ ...state, now, toolsOpen, triggerRef, openTools, closeTools }}>{children}</PrayerToolsContext.Provider>
}

export function usePrayerTools() {
  return useContext(PrayerToolsContext)
}
