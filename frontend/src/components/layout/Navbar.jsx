import { navItems, isNavigationActive } from '@/lib/siteNavigation'
import React from 'react'
import { Link, useLocation } from '@/lib/navigation'

function Navbar() {
  const location = useLocation()
  const isActive = path => isNavigationActive(location.pathname, path)

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white dark:bg-night-800 border-b border-gray-200 dark:border-night-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 移动端布局 */}
          <div className="lg:hidden flex items-center justify-between h-16">
            {/* Logo - 移动端显示 */}
            <Link 
              href="/" 
              className="flex items-center"
            >
              <img 
                src="/assets/images/logo_black.png" 
                alt="书味网" 
                className="h-10 w-auto dark:hidden" 
              />
              <img 
                src="/assets/images/logo_white.png" 
                alt="书味网" 
                className="h-10 w-auto hidden dark:block" 
              />
            </Link>
          </div>

          {/* 桌面端布局 - 居中显示 */}
          <div className="hidden lg:flex items-center justify-center h-16">
            <ul className="flex items-center space-x-1">
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <li key={item.path} className="relative">
                    <Link
                      href={item.path}
                      className={`
                        relative block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                        ${
                          active
                            ? 'text-green-600 dark:text-sage-400 bg-green-50 dark:bg-sage-900/30 font-semibold shadow-sm'
                            : 'text-gray-700 dark:text-night-300 hover:text-green-600 dark:hover:text-sage-400 hover:bg-gray-100 dark:hover:bg-night-700'
                        }
                      `}
                    >
                      {item.label}
                      {/* 桌面端：左侧指示条 */}
                      {active && (
                        <span className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-green-600 dark:bg-sage-400 rounded-r-full"></span>
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

