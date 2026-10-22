import { memo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseVideoLink } from '@/lib/videoEmbed'
import VideoEmbed from './VideoEmbed'
import styles from './RichText.module.css'

// Memoized so mounting video players never re-renders it: React would re-apply the
// HTML and discard the player hosts placed inside it.
const Html = memo(function Html({ html, className, contentRef }) {
  return <div ref={contentRef} className={className} dangerouslySetInnerHTML={{ __html: html || '' }} />
})

// HTML is sanitized by the backend; only presentation belongs here.
// Video links marked by the backend become click-to-load players after hydration;
// the server-rendered page keeps them as ordinary links.
export default function RichText({ html, variant = 'article' }) {
  const ref = useRef(null)
  const [videos, setVideos] = useState([])
  useEffect(() => {
    const replaced = []
    for (const anchor of ref.current?.querySelectorAll('a.video-embed') || []) {
      const video = parseVideoLink(anchor.getAttribute('href'))
      if (!video) continue
      const host = document.createElement('div')
      anchor.replaceWith(host)
      replaced.push({ anchor, host, video, key: replaced.length })
    }
    setVideos(replaced)
    return () => replaced.forEach(({ anchor, host }) => host.replaceWith(anchor))
  }, [html])
  return <>
    <Html html={html} contentRef={ref} className={`${styles.content} ${variant === 'book' ? styles.book : styles.article}`} />
    {videos.map(({ host, video, key }) => createPortal(<VideoEmbed video={video} />, host, key))}
  </>
}
