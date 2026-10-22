import { useCallback, useEffect, useRef, useState } from 'react'

export default function usePrayerLocation() {
  const [query, setQuery] = useState(null)
  const [locationStatus, setLocationStatus] = useState('checking')
  const [locationError, setLocationError] = useState('')
  const [locationNoticeOpen, setLocationNoticeOpen] = useState(false)
  const alive = useRef(true)
  const generation = useRef(0)
  const requesting = useRef(false)

  const requestLocation = useCallback(() => {
    if (requesting.current) return
    const current = ++generation.current
    setQuery(null); setLocationError('')
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocationStatus('unavailable')
      setLocationError('当前浏览器无法定位。请通过 HTTPS 或 localhost 打开，并确认设备支持定位。')
      setLocationNoticeOpen(true)
      return
    }
    requesting.current = true
    setLocationStatus('locating')
    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current || generation.current !== current) return
      requesting.current = false
      const latitude = Math.round(position.coords.latitude * 100) / 100
      const longitude = Math.round(position.coords.longitude * 100) / 100
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        setLocationStatus('error'); setLocationError('未取得有效位置，请重试。'); setLocationNoticeOpen(true)
        return
      }
      setQuery({ kind: 'geo', label: '当前位置', latitude, longitude })
      setLocationStatus('ready'); setLocationNoticeOpen(false)
    }, error => {
      if (!alive.current || generation.current !== current) return
      requesting.current = false
      setLocationStatus(error.code === 1 ? 'denied' : 'error')
      setLocationError(error.code === 1 ? '浏览器未允许位置访问。请在地址栏的网站设置中允许定位后重试。' : '暂时无法取得位置，请确认设备定位已开启后重试。')
      setLocationNoticeOpen(true)
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }, [])

  useEffect(() => {
    alive.current = true
    let stopped = false
    let permission
    const update = () => {
      if (stopped) return
      if (permission?.state === 'granted') requestLocation()
      else {
        generation.current += 1; requesting.current = false
        setQuery(null)
        setLocationStatus(permission?.state === 'denied' ? 'denied' : 'idle')
        setLocationError(permission?.state === 'denied' ? '浏览器未允许位置访问。请在地址栏的网站设置中允许定位后重试。' : '')
        setLocationNoticeOpen(true)
      }
    }
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocationStatus('unavailable')
      setLocationError('定位需要 HTTPS 或 localhost，以及支持定位的浏览器。')
      setLocationNoticeOpen(true)
    } else if (navigator.permissions?.query) {
      // Check existing permission silently; never request a new grant without a click.
      Promise.resolve().then(() => navigator.permissions.query({ name: 'geolocation' })).then(result => {
        if (stopped) return
        permission = result
        permission.addEventListener?.('change', update)
        update()
      }).catch(() => { if (!stopped) update() })
    } else update()
    return () => {
      stopped = true; alive.current = false; generation.current += 1; requesting.current = false
      permission?.removeEventListener?.('change', update)
    }
  }, [requestLocation])

  return { query, locationStatus, locationError, locationNoticeOpen, requestLocation,
    dismissLocationNotice: () => setLocationNoticeOpen(false) }
}
