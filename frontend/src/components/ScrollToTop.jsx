import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    // 使用useLayoutEffect在DOM更新前就滚动，避免视觉上的抖动
    // 路由切换时立即滚动到顶部，不使用smooth避免抖动
    window.scrollTo(0, 0)
    // 同时确保document.body和document.documentElement都滚动到顶部
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  return null
}

export default ScrollToTop

