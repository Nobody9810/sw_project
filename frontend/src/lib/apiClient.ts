import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

// 获取CSRF token的函数
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  // 尝试从cookie获取
  const csrftoken = getCookie('csrftoken')
  if (csrftoken) {
    return csrftoken
  }
  // 尝试从meta标签获取
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    return metaTag.getAttribute('content')
  }
  return null
}

const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// 创建用于评论API的客户端（评论API路径不在/api/下）
export const commentApiClient = axios.create({
  baseURL: '', // 使用完整路径
  timeout: 15000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// 创建用于interactions API的客户端（interactions API路径不在/api/下）
export const interactionsApiClient = axios.create({
  baseURL: '', // 使用完整路径
  timeout: 15000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// 初始化时获取CSRF token
let csrfTokenPromise: Promise<string | null> | null = null

async function ensureCsrfToken(): Promise<string | null> {
  // 如果已经有token，直接返回
  const existingToken = getCsrfToken()
  if (existingToken) {
    return existingToken
  }

  // 如果正在获取token，等待完成
  if (csrfTokenPromise) {
    return csrfTokenPromise
  }

  // 获取新的token
  csrfTokenPromise = (async () => {
    try {
      const response = await commentApiClient.get('/comment/csrf-token/')
      const token = response.data.csrfToken
      if (token) {
        return token
      }
      return null
    } catch (error) {
      console.error('获取CSRF token失败:', error)
      return null
    } finally {
      csrfTokenPromise = null
    }
  })()

  return csrfTokenPromise
}

// 所有写请求共用 token 初始化；浏览器通过 Set-Cookie 接收 CSRF cookie。
for (const client of [apiClient, commentApiClient, interactionsApiClient]) {
  client.interceptors.request.use(async (config) => {
    if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
      const token = await ensureCsrfToken()
      if (!token) throw Object.assign(new Error('无法获取安全令牌，请刷新页面后重试'), { code: 'CSRF_UNAVAILABLE' })
      config.headers['X-CSRFToken'] = token
    }
    return config
  })
}

export default apiClient
