import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Instagram, Facebook, Mail, UserCircle, Moon } from 'lucide-react'
import Clock from './Clock'

function TopSearchBar() {
  const [keyword, setKeyword] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (keyword.trim()) {
      navigate(`/搜索?keyword=${encodeURIComponent(keyword)}`)
    }
  }

  return (
    <div className="hidden md:block w-full bg-[#333] py-[5px] border-b border-[#eee]">
      <div className="w-full max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2.5 md:gap-0">
        <Clock />
        <div className="flex items-center gap-4">
          {/* 搜索表单 */}
          <form className="relative w-[220px] max-w-full" onSubmit={handleSearch}>
            <input 
              className="w-full h-10 py-2 pl-4 pr-12 border-none rounded-full bg-white text-[#333] text-[0.95rem] transition-all duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.1)] placeholder:text-[#95a5a6] placeholder:opacity-80 focus:outline-none focus:shadow-[0_0_0_2px_rgba(255,87,34,0.3)]" 
              type="search" 
              placeholder="搜索内容..." 
              name="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="Search"
            />
            <button 
              className="absolute right-1 top-1 w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5722] to-[#FF7043] text-white border-none flex items-center justify-center transition-all duration-300 shadow-[0_2px_4px_rgba(255,87,34,0.3)] hover:bg-gradient-to-br hover:from-[#FF7043] hover:to-[#FF5722] hover:scale-105 hover:shadow-[0_3px_6px_rgba(255,87,34,0.4)] active:scale-95" 
              type="submit"
            >
              <Search size={16} />
            </button>
          </form>

          {/* 社交图标 */}
          <div className="flex items-center gap-3 ml-4">
            <div className="relative group">
              <a 
                href="https://www.instagram.com/shuwei_365/profilecard/?igsh=MTZ1N2lucXZiNzlsaQ%3D%3D" 
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF5722] to-[#FF7043] text-white flex items-center justify-center transition-all duration-300 shadow-[0_2px_4px_rgba(255,87,34,0.3)] hover:bg-gradient-to-br hover:from-[#FF7043] hover:to-[#FF5722] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,87,34,0.4)]" 
                title="Instagram" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Instagram size={20} />
              </a>
            </div>
            <div className="relative group">
              <a 
                href="https://www.facebook.com/profile.php?id=61568664600545&mibextid=ZbWKwL" 
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF5722] to-[#FF7043] text-white flex items-center justify-center transition-all duration-300 shadow-[0_2px_4px_rgba(255,87,34,0.3)] hover:bg-gradient-to-br hover:from-[#FF7043] hover:to-[#FF5722] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,87,34,0.4)]" 
                title="Facebook" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Facebook size={20} />
              </a>
            </div>
            <div className="relative group">
              <a 
                href="mailto:shuwei506@gmail.com" 
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF5722] to-[#FF7043] text-white flex items-center justify-center transition-all duration-300 shadow-[0_2px_4px_rgba(255,87,34,0.3)] hover:bg-gradient-to-br hover:from-[#FF7043] hover:to-[#FF5722] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,87,34,0.4)]" 
                title="邮箱"
              >
                <Mail size={20} />
              </a>
              <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] hidden group-hover:block z-[1000] whitespace-nowrap animate-fadeIn before:content-[''] before:absolute before:-top-1.5 before:left-1/2 before:-translate-x-1/2 before:rotate-45 before:w-3 before:h-3 before:bg-white before:shadow-[-2px_-2px_4px_rgba(0,0,0,0.05)]">
                <span className="text-[13px] text-[#333]">shuwei506@gmail.com</span>
              </div>
            </div>
          </div>

          {/* 功能图标 */}
          <div className="flex items-center gap-3 ml-3 pl-3 border-l border-white/20">
            <a 
              href="/admin_task/" 
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#661d07] to-[#FF7043] text-white flex items-center justify-center transition-all duration-300 shadow-[0_2px_4px_rgba(255,87,34,0.3)] hover:bg-gradient-to-br hover:from-[#FF7043] hover:to-[#FF5722] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,87,34,0.4)]" 
              title="管理员登录"
            >
              <UserCircle size={20} />
            </a>
            <button 
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#661d07] to-[#FF7043] text-white flex items-center justify-center transition-all duration-300 shadow-[0_2px_4px_rgba(255,87,34,0.3)] hover:bg-gradient-to-br hover:from-[#FF7043] hover:to-[#FF5722] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(255,87,34,0.4)] border-none" 
              title="切换主题" 
              onClick={() => window.themeUtils?.toggleTheme()}
            >
              <Moon size={20} id="theme-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopSearchBar

