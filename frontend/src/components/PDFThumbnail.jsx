import React, { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'

// 全局PDF.js Worker管理 - 确保只初始化一次
let pdfjsWorkerInitialized = false
const initPDFJSWorker = () => {
  if (pdfjsWorkerInitialized) return
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/dflip/js/libs/pdf.worker.min.js'
      pdfjsWorkerInitialized = true
    }
  }
}

// PDF加载缓存 - 避免重复加载同一个PDF
const pdfCache = new Map()

/**
 * PDF缩略图组件
 * 使用 dflip 已有的 PDF.js 渲染 PDF 的第一页作为缩略图
 * 不引入任何额外的库，完全依赖 dflip
 * 支持懒加载和请求取消
 */
function PDFThumbnail({ pdfUrl, alt = 'PDF预览', onError, lazy = true }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pdfjsReady, setPdfjsReady] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(!lazy)
  const abortControllerRef = useRef(null)
  const hasRenderedRef = useRef(false) // 防止重复渲染

  // 懒加载：使用 Intersection Observer 检测元素是否进入视口
  useEffect(() => {
    if (!lazy || shouldLoad) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.01
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [lazy, shouldLoad])

  // 当pdfUrl改变时，重置渲染状态
  useEffect(() => {
    hasRenderedRef.current = false
    setLoading(true)
    setError(false)
  }, [pdfUrl])

  // 加载并使用 dflip 的 PDF.js
  useEffect(() => {
    let checkInterval = null
    let cleanup = null

    // 检查 PDF.js 是否已加载
    const checkPDFJS = () => {
      if (window.pdfjsLib && typeof window.pdfjsLib.getDocument === 'function') {
        // 使用全局函数初始化Worker（只初始化一次）
        initPDFJSWorker()
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
    // 如果启用懒加载但还未触发加载，则不执行
    if (!shouldLoad || !pdfjsReady || !pdfUrl) {
      if (!pdfUrl) {
        setError(true)
        setLoading(false)
      }
      return
    }

    // 防止重复渲染
    if (hasRenderedRef.current) {
      return
    }

    let mounted = true
    let pdfDoc = null
    let loadingTask = null
    let renderTask = null

    // 处理PDF URL
    let fullUrl = pdfUrl
    if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
      if (!pdfUrl.startsWith('/')) {
        fullUrl = `/${pdfUrl}`
      }
    }

    // 检查缓存
    const cacheKey = fullUrl
    const cachedData = pdfCache.get(cacheKey)

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const loadPDF = async () => {
      try {
        // 如果已有缓存，直接使用
        if (cachedData && cachedData.canvasData) {
          if (!mounted || !canvasRef.current || signal.aborted) return
          
          const canvas = canvasRef.current
          const img = new Image()
          img.onload = () => {
            if (!mounted || !canvasRef.current || signal.aborted) return
            const ctx = canvas.getContext('2d')
            canvas.width = cachedData.width
            canvas.height = cachedData.height
            ctx.drawImage(img, 0, 0)
            if (mounted) {
              setLoading(false)
              hasRenderedRef.current = true
            }
          }
          img.src = cachedData.canvasData
          return
        }

        // 检查是否已取消
        if (signal.aborted || !mounted) return

        // 使用 dflip 的 PDF.js 加载文档
        loadingTask = window.pdfjsLib.getDocument({
          url: fullUrl,
          // 使用与 dflip 相同的配置
          disableAutoFetch: true,
          disableStream: true,
        })
        
        // 监听取消信号
        if (signal.aborted) {
          loadingTask.destroy()
          return
        }
        
        pdfDoc = await loadingTask.promise

        if (!mounted || !canvasRef.current || signal.aborted) {
          if (pdfDoc) {
            pdfDoc.destroy().catch(() => {})
          }
          return
        }

        // 获取第一页
        const page = await pdfDoc.getPage(1)
        
        if (!mounted || !canvasRef.current || signal.aborted) {
          if (pdfDoc) {
            pdfDoc.destroy().catch(() => {})
          }
          return
        }

        // 计算合适的缩放比例以适应容器宽度
        const canvas = canvasRef.current
        const containerWidth = canvas.width || 300
        const viewport = page.getViewport({ scale: 1.0 })
        
        // 根据容器宽度计算缩放比例
        const scale = containerWidth / viewport.width
        const scaledViewport = page.getViewport({ scale })

        // 设置 canvas 尺寸
        canvas.width = containerWidth
        canvas.height = scaledViewport.height

        // 渲染 PDF 页面到 canvas
        const renderContext = {
          canvasContext: canvas.getContext('2d'),
          viewport: scaledViewport,
        }

        renderTask = page.render(renderContext)
        await renderTask.promise
        
        if (mounted && !signal.aborted && canvasRef.current) {
          // 缓存渲染结果
          const canvasData = canvas.toDataURL('image/png')
          pdfCache.set(cacheKey, {
            canvasData,
            width: containerWidth,
            height: scaledViewport.height
          })
          
          setLoading(false)
          hasRenderedRef.current = true
        }
      } catch (err) {
        // 忽略Worker终止错误和取消错误
        if (err.name === 'AbortError' || 
            err.name === 'RenderingCancelledException' || 
            signal.aborted ||
            (err.message && err.message.includes('Worker was terminated'))) {
          return
        }
        // 检查是否是取消操作导致的错误
        if (err.message && (err.message.includes('cancelled') || err.message.includes('aborted') || err.message.includes('terminated'))) {
          return
        }
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
      
      // 取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // 取消渲染任务（如果支持）
      if (renderTask && typeof renderTask.cancel === 'function') {
        try {
          renderTask.cancel()
        } catch (e) {
          // 忽略取消错误
        }
      }
      
      // 注意：不要销毁PDF文档，因为可能被其他组件使用
      // 也不要销毁loadingTask，因为Worker是共享的
      // 只清理当前组件的引用
      pdfDoc = null
      loadingTask = null
      renderTask = null
    }
  }, [pdfUrl, pdfjsReady, onError, shouldLoad])

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
    <div 
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
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

