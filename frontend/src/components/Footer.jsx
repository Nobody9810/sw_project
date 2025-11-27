import React, { memo, useEffect } from 'react'
import { Link } from 'react-router-dom'

const Footer = memo(function Footer() {
  // 调试代码：监控footer位置变化（生产环境可移除）


  return (
    <footer 
      className="bg-secondary text-center text-lg-start text-white mt-3" 
      id="footer" 
      style={{ 
        flexShrink: 0, 
        flexGrow: 0,
        position: 'relative',
        width: '100%',
        display: 'block',
        visibility: 'visible',
        opacity: 1,
        marginTop: '40px',
        marginBottom: 0,
        minHeight: '200px',
        boxSizing: 'border-box',
        willChange: 'auto',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      <div className="container p-4 pb-0">
        <div className="row justify-content-center">
          <div className="col-md-8 text-center">
            <img 
              src="/static/images/logo_white.png" 
              className="footer-logo" 
              alt="" 
              loading="eager"
              style={{ display: 'block', width: 'auto', height: 'auto' }}
            />
            <p className="display-12">
              漢語穆斯林交流園地，資訊、知識、思想共用。<br/>
              它是一粒種子，欲生一朵絢麗的希望之花。<br/>
              它是一流，要穿過渾濁的世道。<br/>
              它是一棵胡楊，挺立在大時代的壁戈荒漠，給身處死亡之穀的守望者一抹生的色彩。
            </p>
            <div className="footer-slogan">
              <span>年輕</span>
              <span>夢想</span>
              <span>擧意</span>
            </div>
            <p className="small">
              Copyright 书味 &copy; 2024 | 
              <Link to="/关于我们" className="text-white">关于我们</Link> |
              <Link to="/版权声明" className="text-white">版权声明</Link>
            </p>
          </div>
        </div>
        
        <a id="back-to-top">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor"
            className="bi bi-arrow-up-circle-fill" viewBox="0 0 16 16"
            style={{width: '32px', height: '32px', color: 'blue'}}>
            <path d="M16 8A8 8 0 1 0 0 8a8 8 0 0 0 16 0zm-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z" />
          </svg>
        </a>
      </div>
    </footer>
  )
})

export default Footer

