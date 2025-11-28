import React, { memo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpCircle } from 'lucide-react'

const Footer = memo(function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 100) {
        setShowBackToTop(true)
      } else {
        setShowBackToTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <>
      <footer 
        id="footer"
        className="bg-gradient-to-r from-slate-700 to-orange-600 text-white mt-10 relative w-full flex-shrink-0 flex-grow-0 min-h-[200px] py-8 px-4"
        style={{ 
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <img 
                src="/static/images/logo_white.png" 
                className="max-w-[100px] h-auto mx-auto mb-4 opacity-90 hover:opacity-100 transition-opacity block" 
                alt="Logo" 
                loading="eager"
              />
              <p className="text-[13px] leading-[1.8] text-white/80 mx-auto mb-4 max-w-[600px] px-4">
                漢語穆斯林交流園地，資訊、知識、思想共用。<br/>
                它是一粒種子，欲生一朵絢麗的希望之花。<br/>
                它是一流，要穿過渾濁的世道。<br/>
                它是一棵胡楊，挺立在大時代的壁戈荒漠，給身處死亡之穀的守望者一抹生的色彩。
              </p>
              <div className="text-2xl font-semibold text-white mb-5 tracking-wider">
                <span className="mx-3">年輕</span>
                <span className="text-white/60 mx-3">·</span>
                <span className="mx-3">夢想</span>
                <span className="text-white/60 mx-3">·</span>
                <span className="mx-3">擧意</span>
              </div>
              <p className="text-xs text-white/60 mt-5">
                Copyright 书味 &copy; 2024 | 
                <Link to="/关于我们" className="text-white hover:text-white/80 transition-colors ml-1">关于我们</Link> | 
                <Link to="/版权声明" className="text-white hover:text-white/80 transition-colors ml-1">版权声明</Link>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* 返回顶部按钮 */}
      <button
        id="back-to-top"
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-[1000] cursor-pointer transition-all duration-300 bg-white rounded-full p-2 shadow-lg hover:shadow-xl hover:-translate-y-1 ${
          showBackToTop ? 'block' : 'hidden'
        }`}
        aria-label="返回顶部"
      >
        <ArrowUpCircle className="w-8 h-8 text-blue-600" />
      </button>
    </>
  )
})

export default Footer

