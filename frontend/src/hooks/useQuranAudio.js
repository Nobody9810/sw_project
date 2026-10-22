import { useEffect, useRef, useState } from 'react'
import { quranAudioUrl } from '@/features/content/data/quranReading'

const idle = { verse: null, status: 'idle', error: '', word: null }

export default function useQuranAudio({ chapter, enabled, reciter, track, verses = [], continuous = false }) {
  const current = useRef(null)
  const [playback, setPlayback] = useState(idle)
  const sequence = useRef({ verses, continuous })
  sequence.current = { verses, continuous }

  useEffect(() => {
    setPlayback(idle)
    return () => {
      current.current?.dispose()
      current.current = null
    }
  }, [chapter, enabled, reciter?.id, track?.url])

  const toggle = verse => {
    const clip = track?.chapter === chapter && track?.reciter === reciter?.id
      ? track.timings?.find(timing => timing.verse === verse.verse) : null
    const url = quranAudioUrl(verse, reciter, track, chapter)
    if (!enabled || !url) return
    let session = current.current
    if (session?.verse === verse.verse && !session.failed && (session.pending || !session.audio.paused)) {
      session.attempt++
      session.pending = false
      clearTimeout(session.timer)
      session.audio.pause()
      setPlayback(previous => ({ ...previous, verse: verse.verse, status: 'paused', error: '' }))
      return
    }
    if (!session || session.verse !== verse.verse || session.failed) {
      session?.dispose()
      const audio = new Audio()
      audio.preload = 'none'
      session = { audio, verse: verse.verse, clip, completed: false, failed: false, pending: false, attempt: 0, timer: null, frame: null }
      current.current = session
      const valid = () => current.current === session
      const clear = () => clearTimeout(session.timer)
      const update = status => {
        if (!valid() || session.failed) return
        session.pending = false
        clear()
        if (session.frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(session.frame)
        setPlayback(previous => ({ ...previous, verse: session.verse, status, error: '' }))
      }
      const fail = () => {
        if (!valid()) return
        session.failed = true
        session.pending = false
        clear()
        audio.pause()
        setPlayback(previous => ({ ...previous, verse: session.verse, status: 'error', word: null, error: '音频暂时无法播放，请点击本节重试' }))
      }
      session.wait = () => {
        if (!valid() || session.failed) return
        clear()
        session.pending = true
        setPlayback(previous => ({ ...previous, verse: session.verse, status: 'loading', error: '' }))
        session.timer = setTimeout(fail, 20000)
      }
      const finish = () => {
        if (!valid() || session.failed || session.completed) return
        session.completed = true
        const list = sequence.current.verses
        const index = list.findIndex(item => item.verse === session.verse)
        const next = index >= 0 ? list[index + 1] : null
        const nextClip = next && track?.timings?.find(item => item.verse === next.verse)
        if (sequence.current.continuous && next && next.verse === session.verse + 1 && nextClip && !audio.paused && quranAudioUrl(next, reciter, track, chapter)) {
          // Keep the same chapter stream unlocked on mobile; only the current
          // verse and its real timing data change, never synthesize timestamps.
          clear()
          session.pending = false
          session.attempt++
          session.verse = next.verse
          session.clip = nextClip
          session.completed = false
          // Do not seek: adjacent official intervals may overlap or contain
          // silence. The chapter recording must continue without replaying words.
          setPlayback({ verse: next.verse, status: 'playing', error: '', word: null })
          return
        }
        session.attempt++
        audio.pause()
        update('ended')
        setPlayback(previous => ({ ...previous, word: null,
          error: sequence.current.continuous && next ? '下一节录音不可用，连续播放已停止' : '' }))
      }
      session.tick = () => {
        if (!valid() || session.failed || session.completed) return
        const milliseconds = (audio.currentTime || 0) * 1000
        if (session.clip && milliseconds >= session.clip.to && !audio.paused) {
          finish()
          return
        }
        const word = session.clip?.segments?.find(segment => segment[1] <= milliseconds && milliseconds < segment[2])?.[0] ?? null
        setPlayback(previous => previous.verse === session.verse && previous.word === word
          ? previous : { ...previous, verse: session.verse, word })
      }
      const frames = () => {
        if (!valid() || audio.paused || session.failed) return
        session.tick()
        if (!audio.paused && typeof requestAnimationFrame === 'function') session.frame = requestAnimationFrame(frames)
      }
      const position = () => {
        if (!valid()) return
        if (session.clip) { try { audio.currentTime = session.clip.from / 1000 } catch { /* Seek after metadata becomes available. */ } }
        session.tick()
      }
      const handlers = { playing: () => { update('playing'); frames() }, pause: () => update('paused'),
        ended: finish, waiting: () => { if (!audio.paused) session.wait() }, error: fail,
        loadedmetadata: position, timeupdate: session.tick }
      Object.entries(handlers).forEach(([event, callback]) => audio.addEventListener(event, callback))
      session.dispose = () => {
        clear()
        if (session.frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(session.frame)
        Object.entries(handlers).forEach(([event, callback]) => audio.removeEventListener(event, callback))
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
      session.fail = fail
      audio.src = url
      position()
      setPlayback(previous => ({ ...previous, verse: verse.verse, word: null }))
    }
    if (clip && (session.audio.currentTime * 1000 >= clip.to || session.audio.currentTime * 1000 < clip.from)) session.audio.currentTime = clip.from / 1000
    session.completed = false
    session.wait()
    const attempt = ++session.attempt
    const failed = () => { if (session.attempt === attempt) session.fail() }
    // Called directly from the user's click, including on mobile browsers.
    try { session.audio.play()?.catch(failed) } catch { failed() }
  }

  const toggleLatest = useRef(toggle)
  toggleLatest.current = toggle
  const stableToggle = useRef(verse => toggleLatest.current(verse))
  return { ...playback, toggle: stableToggle.current }
}
