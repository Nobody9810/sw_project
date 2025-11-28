import React, { memo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import TopSearchBar from './TopSearchBar'

const Layout = memo(function Layout({ children }) {

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', // 使用minHeight，允许超过视口高度
        width: '100%',
        position: 'relative',
        overflowX: 'hidden' // 防止横向滚动导致抖动
      }}
    >
      <TopSearchBar />
      <div className="logo-container">
        <Link to="/" className="main-logo">
          <img src="/assets/images/logo_black.png" alt="书味网" className="logo-light" />
          <img src="/assets/images/logo_white.png" alt="书味网" className="logo-dark" />
        </Link>
      </div>
      <Navbar />
      <main style={{ 
        flex: '1 0 auto', // 占据剩余空间，可以增长
        width: '100%',
        maxWidth: '1200px', // 限制最大宽度
        margin: '0 auto', // 居中显示
        padding: '0 20px', // 左右内边距
        minHeight: 'calc(100vh - 500px)', // 确保初始就有足够高度
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </main>
      <Footer />
    </div>
  )
})

export default Layout

