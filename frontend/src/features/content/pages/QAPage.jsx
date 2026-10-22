import { useAuth } from '@/features/auth/AuthContext'
import { useRouter } from 'next/router'
import { Link } from '@/lib/navigation'
import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, PenLine, Send, X, Clock3, CheckCircle2, CornerDownRight, Loader2 } from 'lucide-react'
import { usePageReady } from '@/components/common/PageLoadContext'
import Pagination from '@/components/common/Pagination'
import RequestError from '@/components/common/RequestError'
import LoadingState from '@/components/common/LoadingState'
import { useSidebarOffset } from '@/components/common/StickySidebar'
import { requestErrorMessage } from '@/lib/requestError'
import apiClient from '@/lib/apiClient'
import { formatDateToChinese } from '@/lib/dateFormatter'
import { QA_FRAME, QA_HEADER, QA_COLUMNS, QA_CARD, QA_FORM_BODY, QA_QUESTION_BODY, QA_ANSWER_BODY } from '@/lib/contentLayout'
import useMobileDrawer from '@/hooks/useMobileDrawer'

function QuestionCard({ question }) {
  const answers = question.answers || []
  const answered = answers.length > 0
  const StatusIcon = answered ? CheckCircle2 : Clock3
  const unpublished = question.status && question.status !== 'published'

  return (
    <article className={QA_CARD}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs leading-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 dark:text-night-400">
          <span className="break-words">{question.author_name || '历史提问者'}</span>
          {question.is_guest === true && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-night-700">访客</span>}
          {question.created_at && <time dateTime={question.created_at}>{formatDateToChinese(question.created_at)}</time>}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 ${answered ? 'bg-green-50 text-green-700 dark:bg-sage-950 dark:text-sage-400' : 'bg-gray-100 text-gray-500 dark:bg-night-900 dark:text-night-400'}`}>
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {unpublished ? '未公开' : answered ? '已有答复' : '等待答复'}
        </span>
      </div>
      <h2 className={QA_QUESTION_BODY}>{question.content}</h2>
      {answered && <div className={QA_ANSWER_BODY}>
        {answers.map(answer => <section key={answer.id} aria-label="答复">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs leading-5">
            <div className="flex min-w-0 items-center gap-2 text-green-700 dark:text-sage-400">
              <CornerDownRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="font-medium">{answer.author_name || '管理员'}</span>
              <span className="text-gray-500 dark:text-night-400">答复</span>
            </div>
            {answer.created_at && <time className="text-gray-500 dark:text-night-400" dateTime={answer.created_at}>{formatDateToChinese(answer.created_at)}</time>}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700 dark:text-night-300">{answer.content}</p>
        </section>)}
      </div>}
    </article>
  )
}

export default function QAPage() {
  const { user, loading: authLoading, refresh } = useAuth()
  const router = useRouter()
  const loginPath = `/登录?next=${encodeURIComponent(router.asPath)}`
  const submission = useRef(null)
  useEffect(() => () => submission.current?.abort(), [])
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  usePageReady(loading)
  const [content, setContent] = useState('')
  const [guestName, setGuestName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const sidebarTriggerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const drawerRef = useRef(null)
  const listTopRef = useRef(null)
  const sidebarTop = useSidebarOffset(drawerRef)

  const closeSidebar = () => {
    setSidebarOpen(false)
    sidebarTriggerRef.current?.focus()
  }
  useMobileDrawer({ open: sidebarOpen, onClose: closeSidebar, panelRef: drawerRef, triggerRef: sidebarTriggerRef, initialFocusRef: closeButtonRef })

  useEffect(() => {
    const updateViewport = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (desktop) setSidebarOpen(false)
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])



  const submit = async event => {
    event.preventDefault()
    if (authLoading || submission.current || !content.trim() || (!user && !guestName.trim())) return
    const controller = new AbortController()
    submission.current = controller
    setSubmitting(true)
    setMsg({ text: '', type: '' })
    try {
      await apiClient.post('/qa/questions/', { content: content.trim(), ...(!user ? { name: guestName.trim() } : {}) }, { signal: controller.signal })
      if (controller.signal.aborted) return
      setContent('')
      setMsg({ text: '提问已提交，审核通过后会在这里展示。', type: 'success' })
    } catch (error) {
      if (controller.signal.aborted) return
      if (error.response?.status === 401 || error.response?.status === 403) void refresh()
      setMsg({ text: requestErrorMessage(error, '提交失败，请重试'), type: 'error' })
    } finally {
      if (!controller.signal.aborted) { submission.current = null; setSubmitting(false) }
    }
  }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    const load = async () => {
      try {
        const response = await apiClient.get('/qa/questions/', { params: { page, page_size: 20 }, signal: controller.signal })
        if (active) {
          setQuestions(response.data.results || [])
          setCount(response.data.count || 0)
        }
      } catch (error) {
        if (active && error.code !== 'ERR_CANCELED') setLoadError(requestErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false; controller.abort() }
  }, [page, retryAttempt])

  return (
    <div className={QA_FRAME}>
      <header className={QA_HEADER}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-night-100 md:text-3xl">问答</h1>
          {!loading && !loadError && <span className="text-xs text-gray-500 dark:text-night-400">共 <span className="font-medium tabular-nums text-gray-700 dark:text-night-200">{count}</span> 个提问</span>}
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-night-400">提出你的疑问，阅读已有解答。</p>
        <button ref={sidebarTriggerRef} type="button" onClick={() => setSidebarOpen(true)} aria-label="打开提问面板" aria-haspopup="dialog"
          aria-expanded={sidebarOpen} aria-controls="qa-question-sidebar"
          className="mt-4 inline-flex items-center justify-center gap-2 min-h-11 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:bg-sage-600 dark:hover:bg-sage-700 dark:focus-visible:ring-offset-night-950 lg:hidden">
          <PenLine className="h-4 w-4" aria-hidden="true" />我要提问
        </button>
      </header>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/[0.35] lg:hidden" onClick={closeSidebar} aria-hidden="true" />}
      <div className={QA_COLUMNS}>
        <aside ref={drawerRef} id="qa-question-sidebar" aria-labelledby="qa-question-title" inert={!sidebarOpen && !isDesktop}
          role={sidebarOpen && !isDesktop ? 'dialog' : undefined} aria-modal={sidebarOpen && !isDesktop ? true : undefined} tabIndex={-1}

          style={{ '--sidebar-top': `${sidebarTop}px` }}
          className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none dark:border-night-700 dark:bg-night-800 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm sm:rounded-xl lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-[var(--sidebar-top,5rem)] lg:z-auto lg:m-0 lg:block lg:max-h-none lg:w-auto lg:max-w-none lg:self-start lg:overflow-visible lg:rounded-xl lg:pb-0 lg:shadow-sm ${sidebarOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[calc(100%+1rem)] opacity-0 lg:pointer-events-auto lg:translate-y-0 lg:opacity-100'}`}>
          <div className="flex min-h-0 flex-col lg:block">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-night-700">
              <h2 id="qa-question-title" className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-night-100">
                <PenLine className="h-5 w-5 text-green-700 dark:text-sage-400" aria-hidden="true" />我要提问
              </h2>
              <button ref={closeButtonRef} type="button" onClick={closeSidebar} aria-label="关闭提问面板"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-night-400 lg:hidden">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={`${QA_FORM_BODY} min-h-0 overflow-y-auto overscroll-contain lg:overflow-visible`}>
              <p id="qa-question-help" className="mb-4 text-xs leading-6 text-gray-500 dark:text-night-400">请说明问题的背景与具体疑惑，便于理解和解答。</p>
              {msg.text && <div role={msg.type === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg p-3 text-xs leading-6 ${msg.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-green-50 text-green-700 dark:bg-sage-950 dark:text-sage-300'}`}>{msg.text}</div>}
              {authLoading ? <p className="mb-4 text-sm text-gray-500 dark:text-night-400">正在确认登录状态…</p> : user ?
                <p className="mb-4 text-sm text-gray-600 dark:text-night-300">以“{user.nickname || '读者'}”提问</p> :
                <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-night-300">可直接以访客身份提问，也可以<Link href={loginPath} className="mx-1 inline-flex min-h-11 items-center text-green-700 dark:text-sage-400">登录或注册</Link>后使用账户昵称。</p>}
              <form onSubmit={submit}>
                {!user && <label className="mb-4 block text-sm text-gray-700 dark:text-night-200">昵称
                  <input aria-label="提问昵称" required maxLength={50} autoComplete="nickname" value={guestName}
                    onChange={event => setGuestName(event.target.value)} disabled={submitting}
                    className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-night-700 dark:bg-night-900 dark:text-night-200" placeholder="填写昵称，无需邮箱" />
                </label>}
                <textarea aria-label="问题内容" aria-describedby="qa-question-help" rows={8} maxLength={3000}
                  className="block w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-base lg:text-sm leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 dark:border-night-700 dark:bg-night-900 dark:text-night-200 dark:placeholder:text-night-500 dark:focus:ring-sage-500"
                  placeholder="写下你的问题…" value={content} onChange={event => setContent(event.target.value)} disabled={submitting} />
                <div className="mb-4 mt-2 flex justify-end text-xs tabular-nums text-gray-400 dark:text-night-400">{content.length} / 3000</div>
                <button type="submit" disabled={submitting || authLoading || !content.trim() || (!user && !guestName.trim())}
                  className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sage-600 dark:hover:bg-sage-700 dark:focus-visible:ring-offset-night-800">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  {submitting ? '提交中…' : '提交问题'}
                </button>
                <p className="mt-3 text-center text-xs leading-5 text-gray-500 dark:text-night-400">提问审核后公开展示</p>
              </form>
            </div>
          </div>
        </aside>

        <section ref={listTopRef} aria-label="问答列表" aria-busy={loading} className="min-w-0 scroll-mt-24">
          {loadError && !loading ? <RequestError message={loadError} onRetry={() => setRetryAttempt(value => value + 1)} /> : loading ? <LoadingState kind="qa" label="正在加载问答…" /> : questions.length === 0 ? (
            <div className={`${QA_CARD} py-16 text-center`}>
              <MessageCircle className="mx-auto mb-4 h-8 w-8 text-gray-400 dark:text-night-400" aria-hidden="true" />
              <h2 className="text-base font-medium text-gray-900 dark:text-night-100">还没有公开的提问</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-night-400">欢迎写下你的第一个问题。</p>
            </div>
          ) : <div className="space-y-4">{questions.map(question => <QuestionCard key={question.id} question={question} />)}</div>}
          {!loadError && <Pagination compactMobile page={page} totalPages={Math.ceil(count / 20)} loading={loading} onPageChange={nextPage => {
            setLoading(true); setPage(nextPage)
            listTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
          }} />}
        </section>
      </div>
    </div>
  )
}
