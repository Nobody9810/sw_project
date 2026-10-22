import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { Mail, ArrowLeft } from 'lucide-react'
import { usePageReady } from '@/components/common/PageLoadContext'
import LoadingState from '@/components/common/LoadingState'
import { AUTH_FRAME, AUTH_CARD } from '@/lib/contentLayout'
import { useAuth } from './AuthContext'
import { authFlow, authMessage, pendingEmailFlow, safeReturnPath } from './authApi'
import AccountPanel from './AccountPanel'
import { inputClass, buttonClass } from './authStyles'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, error: sessionError, refresh } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [flow, setFlow] = useState(null)
  const [resuming, setResuming] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const request = useRef(null)
  const writing = useRef(false)
  const next = safeReturnPath(router.query.next)
  usePageReady(loading || resuming)
  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    void authFlow('session', undefined, controller.signal).then(result => {
      if (!controller.signal.aborted) setFlow(pendingEmailFlow(result))
    }).catch(() => { if (!controller.signal.aborted) setError('登录服务暂时无法连接，请稍后重试。') })
      .finally(() => { if (!controller.signal.aborted) setResuming(false) })
    return () => { controller.abort(); request.current?.abort() }
  }, [])
  useEffect(() => {
    if (['google', 'google_unavailable'].includes(router.query.auth_error)) setError('Google 登录暂时不可用，请使用邮箱登录。')
  }, [router.query.auth_error])

  const perform = async action => {
    if (writing.current) return
    writing.current = true
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError(''); setNotice('')
    try { await action(controller.signal) }
    catch { if (!controller.signal.aborted) setError('请求未完成，请检查网络后重试。') }
    finally { if (!controller.signal.aborted) { writing.current = false; setBusy(false) } }
  }
  const send = event => {
    event.preventDefault()
    return perform(async signal => {
      const result = await authFlow(mode === 'signup' ? 'signup' : 'code/request', { email: email.trim() }, signal)
      if (signal.aborted) return
      const pending = pendingEmailFlow(result)
      if (pending) { setFlow(pending); setCode(''); setNotice('请查看邮箱中的验证码；未收到时也请检查垃圾邮件。') }
      else if (result.meta?.is_authenticated) { await refresh(); if (!signal.aborted) await router.replace(next) }
      else setError(authMessage(result))
    })
  }
  const confirm = event => {
    event.preventDefault()
    return perform(async signal => {
      const result = await authFlow(flow === 'verify_email' ? 'email/verify' : 'code/confirm', flow === 'verify_email' ? { key: code.trim() } : { code: code.trim() }, signal)
      if (signal.aborted) return
      if (result.meta?.is_authenticated) { await refresh(); if (!signal.aborted) await router.replace(next) }
      else setError(authMessage(result))
    })
  }
  const signedOut = async () => {
    await refresh()
    setFlow(null); setCode(''); setEmail(''); setError(''); setNotice('已退出登录。')
  }
  const restart = () => { setFlow(null); setCode(''); setError(''); setNotice('') }

  if (loading || resuming) return <div className={AUTH_FRAME}><LoadingState kind="auth" /></div>
  return <div className={AUTH_FRAME}>
    <Head><title>{`${user ? '我的账户' : '登录'} — 書味`}</title><meta name="robots" content="noindex,nofollow" /></Head>
    <section className={AUTH_CARD} aria-labelledby="auth-title">
      {user ? <AccountPanel next={next} refresh={refresh} onSignedOut={signedOut} /> : <>
      <h1 id="auth-title" className="text-2xl font-semibold text-gray-900 dark:text-night-100">{flow ? '输入邮箱验证码' : mode === 'signup' ? '创建账户' : '欢迎回来'}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-night-400">阅读无需登录。使用邮箱验证码登录，无需设置密码。</p>
      {(error || sessionError) && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error || sessionError}</p>}
      {notice && <p role="status" className="mt-5 text-sm leading-6 text-green-700 dark:text-sage-400">{notice}</p>}
      {flow ? <>
        <form onSubmit={confirm} className="mt-6 space-y-5" aria-busy={busy}>
          <label className="block text-sm text-gray-700 dark:text-night-200">验证码<input className={`${inputClass} tracking-widest`} value={code} onChange={event => setCode(event.target.value)} required maxLength={16} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} /></label>
          <button className={buttonClass} type="submit" disabled={busy || !code.trim()}>{busy ? '正在验证…' : '验证并登录'}</button>
        </form>
        <button type="button" disabled={busy} onClick={restart} className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-gray-500 hover:text-green-700 dark:text-night-400"><ArrowLeft className="h-4 w-4" aria-hidden="true" />重新填写邮箱</button>
      </> : <>
        <form onSubmit={send} className="mt-6 space-y-5" aria-busy={busy}>
          <label className="block text-sm text-gray-700 dark:text-night-200">邮箱<input type="email" className={inputClass} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required maxLength={254} /></label>
          <button className={buttonClass} type="submit" disabled={busy || !email.trim()}><Mail className="h-4 w-4" aria-hidden="true" />{busy ? '正在提交…' : '获取验证码'}</button>
        </form>
        <button type="button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); restart() }} className="mt-3 min-h-11 w-full text-sm text-gray-500 hover:text-green-700 dark:text-night-400 dark:hover:text-sage-400">{mode === 'login' ? '首次使用？创建账户' : '已有账户？返回登录'}</button>
        <div className="my-5 border-t border-gray-100 dark:border-night-700" />
        <a href={`/accounts/google/login/?next=${encodeURIComponent(next)}`} className="flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-night-700 dark:text-night-200 dark:hover:bg-night-900">使用 Google 登录</a>
        <p className="mt-3 text-center text-xs leading-5 text-gray-500 dark:text-night-400">部分地区可能无法使用 Google 登录，请使用邮箱登录</p>
      </>}
      </>}
    </section>
  </div>
}
