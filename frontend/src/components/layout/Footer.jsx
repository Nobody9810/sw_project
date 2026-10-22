import React, { memo } from 'react'
import { Link } from '@/lib/navigation'
import styles from './Footer.module.css'

const Footer = memo(function Footer() {
  return (
      <footer 
        id="footer"
        className={`${styles.footer} relative mt-10 min-h-[200px] w-full shrink-0 grow-0 bg-gradient-to-r from-[#2c3e50] to-[#e67e22] pb-[15px] pt-[30px] text-white`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <img 
                src="/assets/images/logo_white.png" 
                className="max-w-[100px] h-auto mx-auto mb-4 opacity-90 hover:opacity-100 transition-opacity block" 
                alt="Logo" 
                loading="eager"
              />
              <p className="text-[13px] leading-[1.8] text-white/80 mx-auto mb-4 max-w-[600px] px-4">
                漢語穆斯林交流園地，資訊、知識、思想共用。<br/>
                它是一粒種子，欲生一朵絢麗的希望之花。<br/>
                它是一股清流，要穿過渾濁的世道。<br/>
                它是一棵胡楊，挺立在大時代的壁戈荒漠，給身處死亡之穀的守望者一抹生的色彩。
              </p>
              <div className="text-2xl font-semibold text-white mb-5 tracking-wider">
                <span className="mx-3">年輕</span>
                <span className="text-white/60 mx-3">·</span>
                <span className="mx-3">夢想</span>
                <span className="text-white/60 mx-3">·</span>
                <span className="mx-3">擧意</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-white/60">
                <span>Copyright 书味 &copy; 2024</span>
                <nav aria-label="页脚链接" className="flex items-center gap-2">
                  <Link href="/关于我们" className="text-white transition-colors hover:text-white/80">关于我们</Link>
                  <span aria-hidden="true">|</span>
                  <Link href="/版权声明" className="text-white transition-colors hover:text-white/80">版权声明</Link>
                  <span aria-hidden="true">|</span>
                  <a href="/admin/" className="text-white transition-colors hover:text-white/80">站点管理</a>
                  <span aria-hidden="true">|</span>
                  <Link href="/更新说明/" className="text-white transition-colors hover:text-white/80">更新说明</Link>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </footer>

  )
})

export default Footer

