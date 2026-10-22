import React, { useState, useEffect } from 'react'
import { CalendarDays, Moon } from 'lucide-react'

function Clock() {
  const [currentTime, setCurrentTime] = useState('加载中...')
  const [hijriDate, setHijriDate] = useState('加载中...')

  useEffect(() => {
    // 更新时间的函数
    const updateTime = () => {
      const now = new Date()
      
      // 格式化当前时间
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      const parts = formatter.formatToParts(now)
      const year = parts.find(part => part.type === 'year')?.value || ''
      const month = parts.find(part => part.type === 'month')?.value || ''
      const day = parts.find(part => part.type === 'day')?.value || ''
      const weekday = parts.find(part => part.type === 'weekday')?.value || ''
      const hour = parts.find(part => part.type === 'hour')?.value || ''
      const minute = parts.find(part => part.type === 'minute')?.value || ''
      const second = parts.find(part => part.type === 'second')?.value || ''
      const timeString = `${year}年${month}月${day}日 ${weekday} ${hour}:${minute}:${second}`
      setCurrentTime(timeString)

      // 转换公历到伊斯兰历（使用更准确的算法）
      const gregorianToHijri = (date) => {
        // 伊斯兰历算法
        const jd = Math.floor((date.getTime() - Date.UTC(1970, 0, 1)) / (1000 * 60 * 60 * 24)) + 2440588
        const l = jd - 1948440 + 10632
        const n = Math.floor((l - 1) / 10631)
        const l1 = l - 10631 * n + 354
        const j = Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) + Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238)
        const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
        
        const month = Math.floor((24 * l2) / 709)
        const day = l2 - Math.floor((709 * month) / 24)
        const year = 30 * n + j - 30

        return { year, month, day }
      }

      try {
        const hijri = gregorianToHijri(now)
        const hijriString = `回历：${hijri.year}年${hijri.month}月${hijri.day}日`
        setHijriDate(hijriString)
      } catch (error) {
        console.error('Hijri date error:', error)
        setHijriDate('') // 如果不支持，就留空
      }
    }

    // 立即执行一次
    updateTime()

    // 每秒更新
    const timer = setInterval(updateTime, 1000)

    // 清理定时器
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-w-0 items-center gap-3 text-xs text-[var(--topbar-accent)]">
      <div className="flex min-w-0 items-center gap-2">
        <CalendarDays strokeWidth={1.75} className="h-4 w-4 shrink-0 text-inherit" aria-hidden="true" />
        <span id="current-time" className="truncate tabular-nums text-white" title={currentTime}>{currentTime}</span>
      </div>
      {hijriDate && (
        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap border-l border-white/10 pl-3 xl:flex">
          <Moon strokeWidth={1.75} className="h-4 w-4 shrink-0 text-inherit" aria-hidden="true" />
          <span id="hijri-date" className="text-white">{hijriDate}</span>
        </div>
      )}
    </div>
  )
}

export default Clock
