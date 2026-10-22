import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useRouter } from 'next/router'
import { Link } from '@/lib/navigation'
import apiClient from '@/lib/apiClient'
import { requestErrorMessage } from '@/lib/requestError'

const inputClass = 'w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-night-600 dark:bg-night-900/50 dark:text-night-100'

export default function FeedbackDialog({ onClose, triggerRef }) {
  const { user, loading: authLoading, refresh } = useAuth()
  const router = useRouter()
  const loginPath = `/登录?next=${encodeURIComponent(router.asPath)}`
  const dialogRef = useRef(null)
  const requestRef = useRef(null)
  const submittingRef = useRef(false)
  const alive = useRef(true)
  const closeTimer = useRef(null)
  const [data, setData] = useState({ name: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    const trigger = triggerRef?.current
    const overflow = document.body.style.overflow
    alive.current = true
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      alive.current = false
      requestRef.current?.abort()
      clearTimeout(closeTimer.current)
      dialog.close()
      document.body.style.overflow = overflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [triggerRef])

  const submit = async event => {
    event.preventDefault()
    if (submittingRef.current || authLoading || (!user && !data.name.trim())) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    const controller = new AbortController()
    requestRef.current = controller
    try {
      await apiClient.post('/feedback/', user ? { message: data.message } : data, { signal: controller.signal })
      if (!alive.current || controller.signal.aborted) return
      setSuccess(true)
      setData({ name: '', email: '', message: '' })
      closeTimer.current = setTimeout(onClose, 2000)
    } catch (failure) {
      if (!controller.signal.aborted && (failure.response?.status === 401 || failure.response?.status === 403)) void refresh()
      if (alive.current && !controller.signal.aborted) setError(requestErrorMessage(failure))
    } finally {
      submittingRef.current = false
      if (alive.current) setSubmitting(false)
    }
  }

  return <dialog ref={dialogRef} aria-labelledby="site-feedback-title" aria-describedby="site-feedback-description" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-0 text-gray-800 shadow-2xl backdrop:bg-gray-950/50 backdrop:backdrop-blur-sm dark:border-night-700 dark:bg-night-overlay dark:text-night-100">
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-night-700">
      <h2 id="site-feedback-title" className="text-lg font-semibold">意见反馈</h2>
      <button type="button" onClick={onClose} aria-label="关闭意见反馈" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-night-400 dark:hover:bg-night-700"><X className="h-5 w-5" aria-hidden="true" /></button>
    </div>
    {success ? <div role="status" className="p-6 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-sage-900/60 dark:text-sage-300"><Check className="h-7 w-7" aria-hidden="true" /></span>
      <h3 className="mb-2 text-lg font-semibold">提交成功！</h3>
      <p id="site-feedback-description" className="text-sm text-gray-600 dark:text-night-300">感谢您的反馈，我们会认真考虑您的建议。</p>
    </div> : <form onSubmit={submit} className="space-y-4 p-6" aria-busy={submitting}>
      <p id="site-feedback-description" className="text-sm text-gray-500 dark:text-night-400">欢迎告诉我们您的建议或遇到的问题。</p>
      {authLoading ? <p className="text-sm text-gray-500 dark:text-night-400">正在确认登录状态…</p> : user ?
        <p className="text-sm text-gray-600 dark:text-night-300">以“{user.nickname || '读者'}”提交，反馈会关联您的账户。</p> :
        <p className="text-sm leading-6 text-gray-600 dark:text-night-300">可直接以访客身份反馈，也可以<Link href={loginPath} onClick={onClose} className="mx-1 inline-flex min-h-11 items-center text-green-700 dark:text-sage-400">登录或注册</Link>后关联账户。</p>}
      {!user && <>
        <div><label htmlFor="feedback-name" className="mb-2 block text-sm font-medium">昵称 <span className="text-red-500">*</span></label>
          <input id="feedback-name" name="name" required maxLength={50} autoComplete="nickname" value={data.name} onChange={event => setData(current => ({ ...current, name: event.target.value }))} className={inputClass} placeholder="填写您的昵称" />
        </div>
        <div><label htmlFor="feedback-email" className="mb-2 block text-sm font-medium">邮箱（选填）</label>
          <input id="feedback-email" name="email" type="email" maxLength={254} autoComplete="email" value={data.email} onChange={event => setData(current => ({ ...current, email: event.target.value }))} className={inputClass} placeholder="如需联系，可留下邮箱" />
        </div>
      </>}
      <div><label htmlFor="feedback-message" className="mb-2 block text-sm font-medium">建议内容 <span className="text-red-500">*</span></label>
        <textarea id="feedback-message" name="message" disabled={submitting} required maxLength={3000} rows={6} value={data.message} onChange={event => setData(current => ({ ...current, message: event.target.value }))} className={`${inputClass} resize-y`} placeholder="请详细描述您的建议或意见…" />
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-xl border border-stone-200 px-4 text-sm text-gray-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:border-night-600 dark:text-night-300 dark:hover:bg-night-700">取消</button>
        <button type="submit" disabled={submitting || authLoading || (!user && !data.name.trim())} className="min-h-11 flex-1 rounded-xl bg-green-700 px-4 text-sm font-medium text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? '提交中…' : '提交'}</button>
      </div>
    </form>}
  </dialog>
}
