import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

// 获取CSRF token的函数
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

function getCsrfToken(): string | null {
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
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// 请求拦截器：添加CSRF token
apiClient.interceptors.request.use(
  (config) => {
    const csrfToken = getCsrfToken()
    if (csrfToken && (config.method === 'post' || config.method === 'put' || config.method === 'patch' || config.method === 'delete')) {
      config.headers['X-CSRFToken'] = csrfToken
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 创建用于评论API的客户端（评论API路径不在/api/下）
export const commentApiClient = axios.create({
  baseURL: '', // 使用完整路径
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// 创建用于interactions API的客户端（interactions API路径不在/api/下）
export const interactionsApiClient = axios.create({
  baseURL: '', // 使用完整路径
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
        // 将token保存到cookie（浏览器会自动处理）
        document.cookie = `csrftoken=${token}; path=/; SameSite=Lax`
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

// 评论API请求拦截器：添加CSRF token
commentApiClient.interceptors.request.use(
  async (config) => {
    // 对于POST/PUT/PATCH/DELETE请求，确保有CSRF token
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch' || config.method === 'delete') {
      let csrfToken = getCsrfToken()
      if (!csrfToken) {
        // 如果没有token，先获取
        csrfToken = await ensureCsrfToken()
      }
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// interactions API请求拦截器：添加CSRF token
interactionsApiClient.interceptors.request.use(
  async (config) => {
    // 对于POST/PUT/PATCH/DELETE请求，确保有CSRF token
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch' || config.method === 'delete') {
      let csrfToken = getCsrfToken()
      if (!csrfToken) {
        // 如果没有token，先获取
        csrfToken = await ensureCsrfToken()
      }
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient


