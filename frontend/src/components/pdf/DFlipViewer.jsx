import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import LoadingState from '@/components/common/LoadingState'

export default function DFlipViewer({ fileUrl, frameClassName = 'rounded-lg border border-gray-200 dark:border-night-700', heightClassName = 'h-[75vh] min-h-[400px] sm:min-h-[560px]' }) {
  const frameRef = useRef(null)
  const [state, setState] = useState({ url: null, status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const pdfUrl = useMemo(() => {
    if (!fileUrl) return null
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    if (fileUrl.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(fileUrl)) return null
    return fileUrl.startsWith('/') ? fileUrl : `/media/${fileUrl}`
  }, [fileUrl])
  const status = state.url === pdfUrl && state.attempt === attempt ? state.status : 'loading'

  useEffect(() => {
    if (!pdfUrl) return
    let finished = false
    const update = status => {
      finished = true
      clearTimeout(timeout)
      setState({ url: pdfUrl, attempt, status })
    }
    // Also catch a missing viewer document/script, before its own timer can run.
    const timeout = setTimeout(() => { if (!finished) update('error') }, 35000)
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      if (event.data?.type === 'dflip-ready') update('ready')
      if (event.data?.type === 'dflip-error') update('error')
    }
    window.addEventListener('message', receive)
    return () => { clearTimeout(timeout); window.removeEventListener('message', receive) }
  }, [pdfUrl, attempt])

  if (!pdfUrl) return <div className="py-8 text-center text-gray-500">未提供有效文档</div>
  return (
    <div className={`relative w-full overflow-hidden bg-gray-100 dark:bg-night-900 ${heightClassName} ${frameClassName}`}>
      {status === 'loading' && <LoadingState kind="inline" label="正在加载阅读器…" className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 dark:bg-night-800/85" />}
      {status === 'error' && <div role="alert" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-gray-50 text-red-500 dark:bg-night-800"><AlertTriangle size={40} aria-hidden="true" />阅读器加载失败
        <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>重新加载</button>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">打开 PDF 原件</a></div>}
      <iframe key={`${pdfUrl}:${attempt}`} ref={frameRef} title="PDF 在线阅读"
        src={`/assets/dflip/viewer.html?v=outline-closed-1&file=${encodeURIComponent(pdfUrl)}`}
        sandbox="allow-scripts allow-same-origin allow-downloads"
        className="h-full w-full border-0" />
    </div>
  )
}
