import React from 'react'
import {
  WhatsappIcon,
  TwitterIcon,
} from 'react-share'
import { Send, Camera } from 'lucide-react'

function ShareButtons({ url, title, description }) {
  // 获取当前页面的完整 URL
  // 在客户端环境下，直接使用 window.location.href 确保总是有值
  const getShareUrl = () => {
    if (typeof window === 'undefined') {
      return url || ''
    }
    // 优先使用传入的 url，否则使用当前页面的完整 URL
    const finalUrl = url || window.location.href
    // 确保 URL 是完整的（包含协议和域名）
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      // 如果是相对路径，转换为绝对路径
      return window.location.origin + (finalUrl.startsWith('/') ? finalUrl : '/' + finalUrl)
    }
    return finalUrl || window.location.href
  }
  
  const shareUrl = getShareUrl()
  const shareTitle = title || (typeof document !== 'undefined' ? document.title : '')
  const shareText = description ? `${shareTitle} - ${description}` : shareTitle
  
  // 如果确实没有 URL（仅在 SSR 时），不显示组件
  // 在客户端，window.location.href 总是有值，所以组件会显示
  if (!shareUrl && typeof window === 'undefined') {
    return null
  }

  // 微信分享处理函数（复制链接）
  const handleWeChatShare = () => {
    const shareUrlToCopy = shareUrl
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrlToCopy).then(() => {
        alert('链接已复制到剪贴板，可以粘贴到微信中分享')
      }).catch(() => {
        // 降级方案
        const textArea = document.createElement('textarea')
        textArea.value = shareUrlToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          alert('链接已复制到剪贴板，可以粘贴到微信中分享')
        } catch (err) {
          alert('请手动复制链接：' + shareUrlToCopy)
        }
        document.body.removeChild(textArea)
      })
    } else {
      alert('请手动复制链接：' + shareUrlToCopy)
    }
  }

  // Instagram 分享处理函数（复制链接）
  const handleInstagramShare = () => {
    const shareUrlToCopy = shareUrl
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrlToCopy).then(() => {
        alert('链接已复制到剪贴板，可以粘贴到 Instagram 中分享')
      }).catch(() => {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrlToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          alert('链接已复制到剪贴板，可以粘贴到 Instagram 中分享')
        } catch (err) {
          alert('请手动复制链接：' + shareUrlToCopy)
        }
        document.body.removeChild(textArea)
      })
    } else {
      alert('请手动复制链接：' + shareUrlToCopy)
    }
  }

  // WhatsApp 和 Twitter 直接打开应用的处理
  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(shareUrl)
    const whatsappUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const handleTwitterShare = () => {
    const encodedTitle = encodeURIComponent(shareTitle)
    const encodedUrl = encodeURIComponent(shareUrl)
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
    window.open(twitterUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
      <span className="text-gray-400 text-sm font-light select-none hidden md:inline">
        |
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {/* 微信分享 */}
        <button
          type="button"
          onClick={handleWeChatShare}
          title="分享到微信"
          aria-label="分享到微信"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-[#07C160] bg-transparent text-[#07C160] cursor-pointer transition-all duration-300 hover:bg-[#07C160] hover:text-white hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#07C160] focus:ring-offset-1"
        >
          <Send className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" strokeWidth={2} />
        </button>

        {/* WhatsApp 分享 - 直接打开应用 */}
        <button
          type="button"
          onClick={handleWhatsAppShare}
          title="分享到 WhatsApp"
          aria-label="分享到 WhatsApp"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-[#25D366] bg-transparent text-[#25D366] cursor-pointer transition-all duration-300 hover:bg-[#25D366] hover:text-white hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-1"
        >
          <WhatsappIcon 
            size={14} 
            round={false} 
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ fill: 'currentColor' }}
          />
        </button>

        {/* Twitter 分享 - 直接打开应用 */}
        <button
          type="button"
          onClick={handleTwitterShare}
          title="分享到 Twitter"
          aria-label="分享到 Twitter"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-[#1DA1F2] bg-transparent text-[#1DA1F2] cursor-pointer transition-all duration-300 hover:bg-[#1DA1F2] hover:text-white hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#1DA1F2] focus:ring-offset-1"
        >
          <TwitterIcon 
            size={14} 
            round={false} 
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ fill: 'currentColor' }}
          />
        </button>

        {/* Instagram 分享 */}
        <button
          type="button"
          onClick={handleInstagramShare}
          title="分享到 Instagram"
          aria-label="分享到 Instagram"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-[#E4405F] bg-transparent text-[#E4405F] cursor-pointer transition-all duration-300 hover:bg-[#E4405F] hover:text-white hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#E4405F] focus:ring-offset-1"
        >
          <Camera className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

export default ShareButtons

