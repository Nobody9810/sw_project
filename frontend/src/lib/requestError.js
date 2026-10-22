export function requestErrorMessage(error, fallback = '加载失败，请稍后重试') {
  if (error?.code === 'CSRF_UNAVAILABLE') return '无法获取安全令牌，请刷新页面后重试'
  if (error?.response?.status === 429) return '提交过于频繁，请稍后再试'
  if (error?.response?.status === 403) return '请求未获允许，请刷新页面后重试'
  if (error?.response?.status === 400) {
    const detail = error.response.data?.error || error.response.data?.content?.[0]
    return typeof detail === 'string' ? detail : fallback
  }
  if (error?.response?.status === 404) return '内容不存在或已下架'
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return '请求超时，请重试'
  if (!error?.response) return '网络连接失败，请重试'
  return fallback
}
