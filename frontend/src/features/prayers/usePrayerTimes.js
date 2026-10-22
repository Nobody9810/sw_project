import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'
import { requestErrorMessage } from '@/lib/requestError'
import usePrayerLocation from './usePrayerLocation'

export default function usePrayerTimes() {
  const location = usePrayerLocation()
  const { query } = location
  const [result, setResult] = useState(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!query) { setResult(null); return }
    const controller = new AbortController()
    setResult(null)
    apiClient.get('/prayers/times/', { params: { latitude: query.latitude, longitude: query.longitude, method: 'auto' }, signal: controller.signal, timeout: 30000 }).then(response => {
      if (!controller.signal.aborted) setResult({ query, data: response.data, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ query, data: null, error: error.response?.data?.error || requestErrorMessage(error) })
    })
    return () => controller.abort()
  }, [query, revision])
  const retry = () => {
    if (!query) { location.requestLocation(); return }
    setResult(null); setRevision(value => value + 1)
  }
  // Hide old data immediately if the permission is revoked, before effects run.
  return { ...location, data: query && result?.query === query ? result.data : null,
    loading: Boolean(query) && result?.query !== query,
    error: query && result?.query === query ? result.error : '', retry }
}
