import React, { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'

/**
 * PDF缩略图组件
 * 使用 dflip 已有的 PDF.js 渲染 PDF 的第一页作为缩略图
 * 不引入任何额外的库，完全依赖 dflip
 */
function PDFThumbnail({ pdfUrl, alt = 'PDF预览', onError }) {
  const canvasRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pdfjsReady, setPdfjsReady] = useState(false)

  // 加载并使用 dflip 的 PDF.js
  useEffect(() => {
    let checkInterval = null
    let cleanup = null

    // 检查 PDF.js 是否已加载
    const checkPDFJS = () => {
      if (window.pdfjsLib && typeof window.pdfjsLib.getDocument === 'function') {
        // 确保 worker 路径已设置（使用 dflip 的 worker）
        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/dflip/js/libs/pdf.worker.min.js'
        }
        return true
      }
      return false
    }

    // 等待 PDF.js 加载的通用函数
    const waitForPDFJS = (maxAttempts = 30) => {
      let attempts = 0
      checkInterval = setInterval(() => {
        attempts++
        if (checkPDFJS()) {
          setPdfjsReady(true)
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        } else if (attempts >= maxAttempts) {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          console.error('PDFThumbnail: 等待 PDF.js 加载超时')
          setError(true)
          setLoading(false)
        }
      }, 100)
    }

    // 如果已经加载，直接使用
    if (checkPDFJS()) {
      setPdfjsReady(true)
      return
    }

    // 检查是否已经有脚本标签
    const existingScript = document.querySelector('script[src*="pdf.min.js"]')
    if (existingScript) {
      // 脚本已存在，等待它加载完成
      if (existingScript.complete || existingScript.readyState === 'complete') {
        // 脚本已加载，等待全局变量设置
        waitForPDFJS(20)
      } else {
        // 脚本正在加载，监听加载完成事件
        const onLoad = () => {
          waitForPDFJS(10)
        }
        existingScript.addEventListener('load', onLoad)
        cleanup = () => {
          existingScript.removeEventListener('load', onLoad)
        }
      }
    } else {
      // 如果没有脚本，主动加载 dflip 的 PDF.js
      const script = document.createElement('script')
      script.src = '/assets/dflip/js/libs/pdf.min.js'
      script.async = true
      script.onload = () => {
        waitForPDFJS(20)
      }
      script.onerror = () => {
        console.error('PDFThumbnail: 无法加载 PDF.js 脚本')
        setError(true)
        setLoading(false)
      }
      document.head.appendChild(script)
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      if (cleanup) {
        cleanup()
      }
    }
  }, [])

  // 加载并渲染 PDF 首页
  useEffect(() => {
    if (!pdfjsReady || !pdfUrl) {
      if (!pdfUrl) {
        setError(true)
        setLoading(false)
      }
      return
    }

    let mounted = true
    let pdfDoc = null

    const loadPDF = async () => {
      try {
        // 处理PDF URL
        let fullUrl = pdfUrl
        if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
          if (!pdfUrl.startsWith('/')) {
            fullUrl = `/${pdfUrl}`
          }
        }

        // 使用 dflip 的 PDF.js 加载文档
        const loadingTask = window.pdfjsLib.getDocument({
          url: fullUrl,
          // 使用与 dflip 相同的配置
          disableAutoFetch: true,
          disableStream: true,
        })
        
        pdfDoc = await loadingTask.promise

        if (!mounted || !canvasRef.current) return

        // 获取第一页
        const page = await pdfDoc.getPage(1)
        
        if (!mounted || !canvasRef.current) return

        // 计算合适的缩放比例以适应容器宽度
        const canvas = canvasRef.current
        const containerWidth = canvas.width || 300
        const viewport = page.getViewport({ scale: 1.0 })
        
        // 根据容器宽度计算缩放比例
        const scale = containerWidth / viewport.width
        const scaledViewport = page.getViewport({ scale })

        // 设置 canvas 尺寸
        canvas.height = scaledViewport.height

        // 渲染 PDF 页面到 canvas
        const renderContext = {
          canvasContext: canvas.getContext('2d'),
          viewport: scaledViewport,
        }

        await page.render(renderContext).promise
        
        if (mounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('PDFThumbnail: 加载PDF缩略图失败:', err.message, 'URL:', pdfUrl)
        if (mounted) {
          setError(true)
          setLoading(false)
          if (onError) onError(err)
        }
      }
    }

    loadPDF()

    return () => {
      mounted = false
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {
          // 静默处理清理错误
        })
      }
    }
  }, [pdfUrl, pdfjsReady, onError])

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        color: '#999',
        fontSize: '0.9rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div>PDF加载失败</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          zIndex: 1
        }}>
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" role="status">
            <span className="sr-only">加载中...</span>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={300}
        style={{
          width: '100%',
          height: 'auto',
          display: loading ? 'none' : 'block'
        }}
        alt={alt}
      />
    </div>
  )
}

export default PDFThumbnail

