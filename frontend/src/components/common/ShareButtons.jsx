import React, { useEffect, useState } from 'react'
import { Copy, MessageCircle, Instagram } from 'lucide-react'
import { readableShareUrl } from '@/lib/shareUrl'
import { articleShareData, articleShareText, shortenShareText } from '@/lib/articleShare'

function ShareButtons({ url, article, section = '', title, author, description }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
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
  
  const shareUrl = readableShareUrl(getShareUrl())
  const data = articleShareData(article || { 标题: title || (typeof document !== 'undefined' ? document.title : ''), 作者: author, 内容: description }, section)
  const shareText = articleShareText(data)
  
  // 如果确实没有 URL（仅在 SSR 时），不显示组件
  // 在客户端，window.location.href 总是有值，所以组件会显示
  if (!mounted) {
    return null
  }

  // Only explicit user actions open a platform or write to the clipboard.
  const copy = async (text, success) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
    } catch {
      const previous = document.activeElement
      const input = document.createElement('textarea')
      input.value = text
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      try {
        if (!document.execCommand('copy')) throw new Error('Copy unavailable')
      } catch {
        alert('请手动复制：' + text)
        return
      } finally {
        document.body.removeChild(input)
        previous?.focus?.({ preventScroll: true })
      }
    }
    alert(success)
  }
  const handleCopyLink = () => copy(shareUrl, '链接已复制到剪贴板')
  const handleInstagramShare = () => copy(`${shareText}\n${shareUrl}`, '分享文案已复制，可粘贴到 Instagram；图片需在 Instagram 中另行添加。')
  const handleWhatsAppShare = () => {
    const text = `${shareUrl}\n\n${shareText}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }
  const handleTwitterShare = () => {
    // Leave space for the article URL, including for text with CJK characters.
    const text = shortenShareText(`${shortenShareText(data.title, 50)}\n${data.description}`, 110)
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
      <span className="text-gray-400 text-sm font-light select-none hidden md:inline">
        |
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {/* 复制链接 */}
        <button
          type="button"
          onClick={handleCopyLink}
          title="复制链接"
          aria-label="复制链接"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-[#07C160] bg-transparent text-[#07C160] cursor-pointer transition-all duration-300 hover:bg-[#07C160] hover:text-white hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#07C160] focus:ring-offset-1"
        >
          <Copy className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        </button>

        {/* WhatsApp 分享 - 直接打开应用 */}
        <button
          type="button"
          onClick={handleWhatsAppShare}
          title="分享到 WhatsApp"
          aria-label="分享到 WhatsApp"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-[#25D366] bg-transparent text-[#25D366] cursor-pointer transition-all duration-300 hover:bg-[#25D366] hover:text-white hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-1"
        >
          <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        </button>

        {/* X 分享 - 直接打开应用 */}
        <button
          type="button"
          onClick={handleTwitterShare}
          title="分享到 X"
          aria-label="分享到 X"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-gray-900 bg-transparent text-gray-900 dark:border-night-200 dark:text-night-200 cursor-pointer transition-all duration-300 hover:bg-gray-900 hover:text-white dark:hover:bg-night-200 dark:hover:text-night-900 hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
        >
          <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center font-sans text-[19px] font-normal leading-none" aria-hidden="true">𝕏</span>
        </button>

        {/* Instagram 分享 */}
        <button
          type="button"
          onClick={handleInstagramShare}
          title="复制 Instagram 分享文案"
          aria-label="复制 Instagram 分享文案"
          className="inline-flex items-center justify-center w-8 h-8 md:w-8 md:h-8 rounded-full border border-[#E4405F] bg-transparent text-[#E4405F] cursor-pointer transition-all duration-300 hover:bg-[#E4405F] hover:text-white hover:-translate-y-0.5 hover:scale-110 hover:shadow-md active:translate-y-0 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#E4405F] focus:ring-offset-1"
        >
          <Instagram className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default ShareButtons

