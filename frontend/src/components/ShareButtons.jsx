import React from 'react'
import {
  WhatsappIcon,
  TwitterIcon,
} from 'react-share'
import { Send, Camera } from 'lucide-react'
import './ShareButtons.css'

function ShareButtons({ url, title, description }) {
  // 获取当前页面的完整 URL
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
  const shareTitle = title || (typeof document !== 'undefined' ? document.title : '')
  const shareText = description ? `${shareTitle} - ${description}` : shareTitle

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

  if (!shareUrl) {
    return null
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
    <div className="share-buttons-container">
      <span className="share-divider">|</span>
      <div className="share-buttons">
        {/* 微信分享 */}
        <button
          type="button"
          className="share-button share-button-wechat"
          onClick={handleWeChatShare}
          title="分享到微信"
          aria-label="分享到微信"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* WhatsApp 分享 - 直接打开应用 */}
        <button
          type="button"
          className="share-button share-button-whatsapp"
          onClick={handleWhatsAppShare}
          title="分享到 WhatsApp"
          aria-label="分享到 WhatsApp"
        >
          <WhatsappIcon size={14} round={false} />
        </button>

        {/* Twitter 分享 - 直接打开应用 */}
        <button
          type="button"
          className="share-button share-button-twitter"
          onClick={handleTwitterShare}
          title="分享到 Twitter"
          aria-label="分享到 Twitter"
        >
          <TwitterIcon size={14} round={false} />
        </button>

        {/* Instagram 分享 */}
        <button
          type="button"
          className="share-button share-button-instagram"
          onClick={handleInstagramShare}
          title="分享到 Instagram"
          aria-label="分享到 Instagram"
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default ShareButtons

