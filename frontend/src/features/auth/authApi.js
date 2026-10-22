import { commentApiClient } from '@/lib/apiClient'

// Browser endpoints keep allauth's Session/CSRF protection; no app session tokens.
export async function authFlow(path, data, signal) {
  const options = { signal, validateStatus: status => status < 500 }
  const url = `/_allauth/browser/v1/auth/${path}/`
  const response = data === undefined
    ? await commentApiClient.get(url, options)
    : await commentApiClient.post(url, data, options)
  return { ...response.data, status: response.status }
}

export function pendingEmailFlow(result) {
  const flows = result?.data?.flows || []
  return flows.find(flow => flow.is_pending && ['login_by_code', 'verify_email'].includes(flow.id))?.id || null
}

export function authMessage(result) {
  if (result?.status === 429) return '操作过于频繁，请稍后再试。'
  if (result?.status === 403) return '安全校验未通过，请刷新页面后重试。'
  if (result?.status === 409) return '登录流程已变更，请重新获取验证码。'
  if (result?.errors?.some(error => ['code', 'key'].includes(error.param))) return '验证码不正确或已失效，请检查后重试。'
  return '暂时无法完成登录，请检查输入后重试。'
}

export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || (value.includes('\\') || Array.from(value).some(char => char.charCodeAt(0) < 32))) return '/'
  try {
    const parsed = new URL(value, 'https://site.local')
    if (parsed.origin !== 'https://site.local' || decodeURIComponent(parsed.pathname).replace(/\/$/, '') === '/登录') return '/'
    return parsed.pathname + parsed.search + parsed.hash
  } catch { return '/' }
}
