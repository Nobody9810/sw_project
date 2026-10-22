import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'

// Secondary reader data must never hide the already available text and translation.
export default function useQuranReaderData(resource, number, reciter, enabled = true) {
  const [state, setState] = useState({ status: 'idle', data: null, error: '', code: '' })
  const [attempt, setAttempt] = useState(0)
  const key = `${resource}:${number}:${reciter || ''}:${enabled}`
  useEffect(() => {
    if (!enabled || !number) { setState({ status: 'idle', data: null, error: '', code: '' }); return }
    const controller = new AbortController()
    let active = true
    setState({ key, status: 'loading', data: null, error: '', code: '' })
    apiClient.get(`hadith/quran-reader/${resource}/${number}/`, {
      signal: controller.signal, timeout: 60000, params: resource === 'audio' ? { reciter } : undefined,
    }).then(response => {
      if (active) setState({ key, status: 'ready', data: response.data, error: '', code: '' })
    }).catch(error => {
      if (active && error.code !== 'ERR_CANCELED') setState({ key, status: 'error', data: null,
        error: error.response?.data?.error || '阅读数据暂时不可用，请重试', code: error.response?.data?.code || '' })
    })
    return () => { active = false; controller.abort() }
  }, [resource, number, reciter, enabled, attempt, key])
  const visible = state.key === key ? state : { status: enabled ? 'loading' : 'idle', data: null, error: '', code: '' }
  return { ...visible, retry: () => setAttempt(value => value + 1) }
}
