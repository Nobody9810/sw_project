import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import apiClient from '@/lib/apiClient'

/** @typedef {{type: 'image', url: string} | {type: 'preset', key: string}} ReaderAvatar */
/** @typedef {{id: number, nickname: string, avatar?: ReaderAvatar | null}} Reader */
/** @type {import('react').Context<{user: Reader | null, loading: boolean, error: string, refresh: () => Promise<Reader | null>}>} */
const AuthContext = createContext({ user: null, loading: false, error: '', refresh: async () => null })
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' })
  const pending = useRef(null)
  const refresh = useCallback(async () => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    try {
      const response = await apiClient.get('auth/session/', { signal: controller.signal })
      if (controller.signal.aborted) return null
      const user = response.data.user || null
      setState({ user, loading: false, error: '' })
      return user
    } catch {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: '登录状态暂时无法获取' }))
      return null
    }
  }, [])
  useEffect(() => {
    void refresh()
    const update = () => { void refresh() }
    window.addEventListener('focus', update)
    return () => { pending.current?.abort(); window.removeEventListener('focus', update) }
  }, [refresh])
  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>
}
