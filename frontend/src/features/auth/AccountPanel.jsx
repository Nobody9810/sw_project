import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, Check, KeyRound, LogOut, Mail, RotateCcw } from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { Link } from '@/lib/navigation'
import { formatDateToChinese } from '@/lib/dateFormatter'
import { SkeletonBlock } from '@/components/common/SkeletonContent'
import { inputClass, buttonClass } from './authStyles'
import Avatar from './Avatar'
import AvatarPicker, { AVATAR_MAX_BYTES } from './AvatarPicker'

const sectionTitle = 'text-sm font-medium text-gray-900 dark:text-night-100'
const muted = 'text-xs leading-5 text-gray-500 dark:text-night-400'
const badge = 'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs'
const on = `${badge} bg-green-50 text-green-700 dark:bg-sage-900/40 dark:text-sage-300`
const off = `${badge} bg-gray-100 text-gray-500 dark:bg-night-700 dark:text-night-400`

function Method({ icon: Icon, title, detail, state, active }) {
  return <li className="flex items-start gap-3 py-3">
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 dark:bg-night-900 dark:text-night-400"><Icon className="h-4 w-4" aria-hidden="true" /></span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-gray-900 dark:text-night-100">{title}</p><span className={active ? on : off}>{active && <Check className="h-3 w-3" aria-hidden="true" />}{state}</span></div>
      <p className={`${muted} mt-0.5 break-all`}>{detail}</p>
    </div>
  </li>
}

// The signed-in reader's own page: who they appear as, how they sign in, and sign-out.
export default function AccountPanel({ next, onSignedOut, refresh }) {
  const [account, setAccount] = useState(null)
  const [failed, setFailed] = useState(false)
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState({ text: '', error: false })
  const [picking, setPicking] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState({ text: '', error: false })
  const request = useRef(null)
  const writing = useRef(false)

  const load = useCallback(() => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setFailed(false)
    apiClient.get('auth/profile/', { signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return
      setAccount(response.data.account)
      setNickname(response.data.account.nickname)
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
  }, [])
  useEffect(() => { load(); return () => request.current?.abort() }, [load])

  const perform = async (action, failure, report = setStatus) => {
    if (writing.current) return
    writing.current = true
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setStatus({ text: '', error: false }); setAvatarStatus({ text: '', error: false })
    try { await action(controller.signal) }
    catch (error) {
      if (!controller.signal.aborted) report({ text: error.response?.status === 400 && error.response.data?.error || (error.response?.status === 429 ? '操作过于频繁，请稍后再试。' : failure), error: true })
    }
    finally { if (!controller.signal.aborted) { writing.current = false; setBusy(false) } }
  }
  const save = event => {
    event.preventDefault()
    return perform(async signal => {
      const response = await apiClient.post('auth/profile/', { nickname: nickname.trim() }, { signal })
      if (signal.aborted) return
      const saved = response.data.user.nickname
      setAccount(previous => ({ ...previous, nickname: saved }))
      setNickname(saved)
      setStatus({ text: '昵称已保存', error: false })
      void refresh()
    }, '昵称未保存，请检查网络后重试。')
  }
  const changeAvatar = (send, done) => perform(async signal => {
    const response = await send(signal)
    if (signal.aborted) return
    setAccount(previous => ({ ...previous, avatar: response.data.user.avatar }))
    setAvatarStatus({ text: done, error: false })
    void refresh()
  }, '头像未更新，请检查网络后重试。', setAvatarStatus)
  const pickPreset = preset => changeAvatar(signal => apiClient.post('auth/avatar/', { preset }, { signal }), '头像已更换')
  const removeAvatar = () => changeAvatar(signal => apiClient.delete('auth/avatar/', { signal }), '已恢复为昵称首字')
  const uploadAvatar = file => {
    if (file.size > AVATAR_MAX_BYTES) { setAvatarStatus({ text: '图片不能超过 2 MB', error: true }); return }
    const form = new FormData()
    form.append('file', file)
    return changeAvatar(signal => apiClient.post('auth/avatar/', form, { signal, timeout: 60000 }), '头像已上传')
  }
  const signOut = () => perform(async signal => {
    await apiClient.post('auth/logout/', {}, { signal })
    if (!signal.aborted) onSignedOut()
  }, '退出未完成，请检查网络后重试。')

  if (failed) return <div className="py-6 text-center">
    <p role="alert" className="text-sm text-gray-600 dark:text-night-300">账户信息暂时无法加载。</p>
    <button type="button" onClick={load} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 hover:border-green-300 hover:text-green-700 dark:border-night-700 dark:text-night-200 dark:hover:text-sage-300"><RotateCcw className="h-4 w-4" aria-hidden="true" />重试</button>
  </div>
  if (!account) return <div role="status" aria-busy="true" className="motion-safe:animate-pulse">
    <span className="sr-only">正在加载账户信息…</span>
    <div className="flex items-center gap-4" aria-hidden="true"><SkeletonBlock rounded={false} className="h-16 w-16 rounded-full" /><div className="flex-1"><SkeletonBlock className="h-6 w-28" /><SkeletonBlock className="mt-2 h-4 w-40" /></div></div>
    <SkeletonBlock className="mt-8 h-11 w-full" /><SkeletonBlock className="mt-6 h-28 w-full" />
  </div>

  const shown = account.nickname || '读者'
  const unchanged = nickname.trim() === account.nickname
  return <>
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => setPicking(open => !open)} aria-expanded={picking} aria-controls="avatar-picker" aria-label="更换头像" title="更换头像"
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-night-800">
        <Avatar avatar={account.avatar} name={shown} className="h-16 w-16 text-2xl transition group-hover:brightness-95" />
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-600 text-white shadow-sm transition-colors group-hover:bg-green-700 dark:border-night-800 dark:bg-sage-600"><Camera className="h-3 w-3" /></span>
      </button>
      <div className="min-w-0">
        <h1 id="auth-title" className="truncate text-xl font-semibold text-gray-900 dark:text-night-100">{shown}</h1>
        <p className={`${muted} mt-1`}>{formatDateToChinese(account.joined)}加入 · 邮箱不会公开展示</p>
      </div>
    </div>
    {picking && <AvatarPicker avatar={account.avatar} busy={busy} status={avatarStatus} onPreset={pickPreset} onUpload={uploadAvatar} onRemove={removeAvatar} onClose={() => setPicking(false)} />}
    {next !== '/' && <Link href={next} className="mt-5 flex min-h-11 items-center justify-between rounded-lg bg-green-50 px-4 text-sm font-medium text-green-800 hover:bg-green-100 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50">返回刚才的页面<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}

    <form onSubmit={save} className="mt-7" aria-busy={busy}>
      <label htmlFor="account-nickname" className={sectionTitle}>昵称</label>
      <div className="flex gap-2">
        <input id="account-nickname" className={`${inputClass} min-w-0 flex-1`} maxLength={50} value={nickname} placeholder="读者" autoComplete="nickname"
          aria-describedby="account-nickname-help" onChange={event => { setNickname(event.target.value); setStatus({ text: '', error: false }) }} />
        <button className={`${buttonClass.replace('w-full', '')} mt-2 shrink-0 px-5`} disabled={busy || unchanged} type="submit">保存</button>
      </div>
      <p id="account-nickname-help" className={`${muted} mt-2`}>评论时显示的名字，最多50字；留空显示为“读者”。</p>
      <p role="status" className={`mt-1 min-h-5 text-xs ${status.error ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-sage-400'}`}>{status.text}</p>
    </form>

    <section className="mt-4 border-t border-gray-100 pt-5 dark:border-night-700" aria-labelledby="account-methods">
      <h2 id="account-methods" className={sectionTitle}>登录方式</h2>
      <ul className="mt-1 divide-y divide-gray-100 dark:divide-night-700">
        <Method icon={Mail} title="邮箱验证码" detail={account.email} active={account.email_verified} state={account.email_verified ? '已验证' : '未验证'} />
        <Method icon={KeyRound} title="Google" active={account.google} state={account.google ? '已关联' : '未关联'}
          detail={account.google ? '可以使用 Google 登录此账户。' : '用同一邮箱的 Google 账户登录时会自动关联。'} />
      </ul>
    </section>

    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-night-700">
      <button type="button" onClick={signOut} disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 dark:text-night-300 dark:hover:bg-red-950/30 dark:hover:text-red-300">
        <LogOut className="h-4 w-4" aria-hidden="true" />退出登录
      </button>
    </div>
  </>
}
