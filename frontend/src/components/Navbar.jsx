import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 992)

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const wasDesktop = isDesktop
      const nowDesktop = window.innerWidth >= 992
      setIsDesktop(nowDesktop)
      
      // 如果从移动端切换到桌面端，关闭移动菜单状态
      if (nowDesktop && !wasDesktop) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isDesktop])

  // 当从移动端切换到桌面端时，重置菜单状态
  useEffect(() => {
    if (isDesktop) {
      setIsMobileMenuOpen(false)
    }
  }, [isDesktop])

  // 处理移动端菜单切换
  const handleToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // 点击链接后关闭移动端菜单
  const handleLinkClick = () => {
    if (!isDesktop) {
      setIsMobileMenuOpen(false)
    }
  }

  // 导航菜单项配置
  const navItems = [
    { path: '/', label: '首页' },
    { path: '/书讯', label: '书讯' },
    { path: '/书评', label: '书评' },
    { path: '/观点', label: '观点' },
    { path: '/译林', label: '译林' },
    { path: '/文艺', label: '文艺' },
    { path: '/文史', label: '文史' },
    { path: '/书库', label: '书库' },
    { path: '/通讯', label: '通讯' },
    { path: '/古籍', label: '古籍' },
    { path: '/论文', label: '论文' },
    { path: '/问答', label: '问答' },
    { path: '/经训', label: '经训' },
  ]

  // 判断当前路径是否匹配菜单项
  const isActive = (path) => {
    const currentPath = location.pathname
    
    // 首页精确匹配
    if (path === '/') {
      return currentPath === '/'
    }
    
    // 对于其他路径，尝试多种匹配方式
    // 1. 直接匹配（已编码的路径）
    if (currentPath === path) {
      return true
    }
    
    // 2. 检查是否是子路径（如 /书评/123）
    if (currentPath.startsWith(path + '/')) {
      return true
    }
    
    // 3. 尝试解码后匹配（处理 URL 编码）
    try {
      const decodedCurrent = decodeURIComponent(currentPath)
      const decodedPath = decodeURIComponent(path)
      
      if (decodedCurrent === decodedPath) {
        return true
      }
      
      if (decodedCurrent.startsWith(decodedPath + '/')) {
        return true
      }
    } catch (e) {
      // 解码失败，忽略
    }
    
    // 4. 尝试编码后匹配
    try {
      const encodedPath = encodeURI(path)
      if (currentPath === encodedPath || currentPath.startsWith(encodedPath + '/')) {
        return true
      }
    } catch (e) {
      // 编码失败，忽略
    }
    
    return false
  }

  return (
    <>
      {/* 移动端遮罩层 */}
      {isMobileMenuOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={handleToggle}
          aria-hidden="true"
        />
      )}

      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 移动端布局 */}
          <div className="lg:hidden flex items-center justify-between h-16">
            {/* Logo - 移动端显示 */}
            <Link 
              to="/" 
              className="flex items-center"
            >
              <img 
                src="/assets/images/logo_black.png" 
                alt="书味网" 
                className="logo-light h-10 w-auto dark:hidden" 
              />
              <img 
                src="/assets/images/logo_white.png" 
                alt="书味网" 
                className="logo-dark h-10 w-auto hidden dark:block" 
              />
            </Link>
            
            {/* 移动端菜单按钮 - 始终显示菜单图标 */}
            <button 
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 transition-colors"
              type="button" 
              onClick={handleToggle}
              aria-expanded={isMobileMenuOpen}
              aria-controls="navbarNavMobile"
              aria-label="打开菜单"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* 移动端侧边栏导航菜单 */}
          <div
            className={`
              fixed lg:hidden top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl z-50
              transform transition-transform duration-300 ease-in-out
              ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            id="navbarNavMobile"
          >
            {/* 侧边栏头部 */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              <Link 
                to="/" 
                className="flex items-center"
                onClick={handleLinkClick}
              >
                <img 
                  src="/assets/images/logo_black.png" 
                  alt="书味网" 
                  className="logo-light h-8 w-auto dark:hidden" 
                />
                <img 
                  src="/assets/images/logo_white.png" 
                  alt="书味网" 
                  className="logo-dark h-8 w-auto hidden dark:block" 
                />
              </Link>
              {/* 侧边栏关闭按钮 */}
              <button
                onClick={handleToggle}
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭菜单"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 导航菜单项 */}
            <ul className="flex flex-col py-4 overflow-y-auto">
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <li key={item.path} className="relative">
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`
                        relative flex items-center px-4 py-3 text-sm font-medium transition-all duration-200
                        ${
                          active
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 font-semibold'
                            : 'text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {item.label}
                      {/* 移动端：左侧指示条 */}
                      {active && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-green-600 dark:bg-green-400 rounded-r-full"></span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* 桌面端布局 - 居中显示 */}
          <div className="hidden lg:flex items-center justify-center h-16">
            <ul className="flex items-center space-x-1">
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <li key={item.path} className="relative">
                    <Link
                      to={item.path}
                      className={`
                        relative block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                        ${
                          active
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 font-semibold shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {item.label}
                      {/* 桌面端：左侧指示条 */}
                      {active && (
                        <span className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-green-600 dark:bg-green-400 rounded-r-full"></span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Navbar

