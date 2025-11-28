import React, { useEffect, useRef, useState } from 'react'
import { FileText, AlertTriangle } from 'lucide-react'

function DFlipViewer({ fileUrl }) {
  const containerRef = useRef(null)
  const dflipInstanceRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 处理PDF URL，确保正确连接到后端
  const pdfUrl = React.useMemo(() => {
    if (!fileUrl) {
      console.warn('DFlipViewer: fileUrl 为空')
      return null
    }
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl
    }
    if (fileUrl.startsWith('/media/')) {
      return fileUrl
    }
    if (!fileUrl.startsWith('/')) {
      return `/media/${fileUrl}`
    }
    return fileUrl
  }, [fileUrl])

  useEffect(() => {
    // 确保 PDF.js worker 路径已设置
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/dflip/js/libs/pdf.worker.min.js'
      }
    }

    // 等待库加载的函数
    const waitForLibraries = (callback, maxAttempts = 50) => {
      let attempts = 0
      const checkLibraries = () => {
        attempts++
        
        // 确保 PDF.js worker 路径已设置（每次检查时都设置）
        if (typeof window !== 'undefined' && window.pdfjsLib) {
          if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/dflip/js/libs/pdf.worker.min.js'
          }
        }
        
        const hasJQuery = typeof window !== 'undefined' && window.jQuery
        const hasDFLIP = typeof window !== 'undefined' && window.DFLIP
        const hasFlipBook = hasJQuery && typeof window.jQuery.fn.flipBook !== 'undefined'
        const hasPdfjsLib = typeof window !== 'undefined' && window.pdfjsLib
        
        if (hasJQuery && hasDFLIP && hasFlipBook) {
          callback()
        } else if (attempts < maxAttempts) {
          setTimeout(checkLibraries, 100)
        } else {
          console.error('DFlipViewer: dflip 或 jQuery 未加载', {
            jQuery: hasJQuery,
            DFLIP: hasDFLIP,
            flipBookPlugin: hasFlipBook,
            pdfjsLib: hasPdfjsLib
          })
          setError('PDF 查看器库未加载，请刷新页面重试')
          setLoading(false)
        }
      }
      checkLibraries()
    }

    if (!pdfUrl) {
      console.warn('DFlipViewer: pdfUrl 为空，无法加载PDF')
      setLoading(false)
      return
    }

    if (!containerRef.current) {
      console.warn('DFlipViewer: 容器元素未准备好')
      setLoading(false)
      return
    }

    // 清理之前的实例
    if (dflipInstanceRef.current) {
      try {
        const $container = window.jQuery(containerRef.current)
        if ($container.data('dflip')) {
          $container.data('dflip').destroy()
        }
        $container.empty()
      } catch (e) {
        console.warn('清理 dflip 实例时出错:', e)
      }
    }

    setLoading(true)
    setError(null)

    // 创建容器元素
    const containerId = `dflip-container-${Date.now()}`
    containerRef.current.innerHTML = `<div id="${containerId}"></div>`

    let timeoutId = null

    // 等待库加载完成后再初始化
    waitForLibraries(() => {
      try {
        // 初始化 dflip
        const $container = window.jQuery(`#${containerId}`)
        
        if (typeof $container.flipBook !== 'function') {
          console.error('DFlipViewer: flipBook 方法不存在', {
            container: $container,
            flipBook: typeof $container.flipBook,
            jQuery: window.jQuery
          })
          setError('PDF 查看器初始化失败：dflip 插件未正确加载')
          setLoading(false)
          return
        }

        
        const flipbookInstance = $container.flipBook(pdfUrl, {
          webgl: true,
          webglShadow: true,
          height: 'auto',
          autoEnableOutline: false,
          autoEnableThumbnail: false,
          enableDownload: true,
          duration: 800,
          direction: window.DFLIP.DIRECTION.LTR,
          pageMode: window.DFLIP.PAGE_MODE.AUTO,
          backgroundColor: '#fff',
          forceFit: true,
          transparent: false,
          hard: 'none',
          openPage: 1,
          autoPlay: false,
          controlsPosition: window.DFLIP.CONTROLSPOSITION.BOTTOM,
          onReady: () => {
            setLoading(false)
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
          },
          onError: (error) => {
            console.error('DFlipViewer: PDF 加载错误', error)
            setError('PDF 文件加载失败，请检查文件是否存在')
            setLoading(false)
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
          }
        })

        // 保存实例引用
        dflipInstanceRef.current = flipbookInstance

        // 设置超时处理
        timeoutId = setTimeout(() => {
          console.warn('DFlipViewer: 加载超时')
          setLoading(false)
          timeoutId = null
        }, 30000) // 30秒超时
      } catch (err) {
        console.error('DFlipViewer: 初始化失败', err)
        setError('PDF 查看器初始化失败')
        setLoading(false)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    })

    // 清理函数
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      try {
        if (dflipInstanceRef.current && typeof dflipInstanceRef.current.dispose === 'function') {
          dflipInstanceRef.current.dispose()
        }
      } catch (e) {
        console.warn('清理 dflip 实例时出错:', e)
      }
    }
  }, [pdfUrl])

  if (!pdfUrl) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-5">
        <FileText className="w-16 h-16 mx-auto mb-2 text-gray-400" />
        <p>未提供PDF文件</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg" role="alert">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <strong>PDF 加载失败：</strong>{error}
        </div>
        <div className="mt-2">
          <small className="text-red-700 dark:text-red-300">
            如果问题持续存在，请尝试：
            <ul className="mb-0 mt-1 list-disc list-inside">
              <li>刷新页面</li>
              <li>检查网络连接</li>
              <li>确认PDF文件是否存在</li>
            </ul>
          </small>
        </div>
      </div>
    )
  }

  return (
    <div className="dflip-viewer-container" style={{ width: '100%', minHeight: '600px' }}>
      {loading && (
        <div className="text-center py-5">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status">
            <span className="sr-only">加载中...</span>
          </div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">正在加载PDF...</p>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%' }}></div>
    </div>
  )
}

export default DFlipViewer

