import React, { useEffect, useRef, useState } from 'react'

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
    console.log('DFlipViewer: 原始 fileUrl:', fileUrl)
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      console.log('DFlipViewer: 使用完整URL:', fileUrl)
      return fileUrl
    }
    if (fileUrl.startsWith('/media/')) {
      console.log('DFlipViewer: 使用 /media/ 路径:', fileUrl)
      return fileUrl
    }
    if (!fileUrl.startsWith('/')) {
      const url = `/media/${fileUrl}`
      console.log('DFlipViewer: 添加 /media/ 前缀:', url)
      return url
    }
    console.log('DFlipViewer: 直接返回路径:', fileUrl)
    return fileUrl
  }, [fileUrl])

  useEffect(() => {
    // 等待库加载的函数
    const waitForLibraries = (callback, maxAttempts = 50) => {
      let attempts = 0
      const checkLibraries = () => {
        attempts++
        if (typeof window !== 'undefined' && 
            window.jQuery && 
            window.DFLIP && 
            typeof window.jQuery.fn.flipBook !== 'undefined') {
          callback()
        } else if (attempts < maxAttempts) {
          setTimeout(checkLibraries, 100)
        } else {
          console.error('DFlipViewer: dflip 或 jQuery 未加载', {
            jQuery: !!window.jQuery,
            DFLIP: !!window.DFLIP,
            flipBookPlugin: typeof window.jQuery?.fn?.flipBook
          })
          setError('PDF 查看器库未加载，请刷新页面重试')
          setLoading(false)
        }
      }
      checkLibraries()
    }

    if (!pdfUrl || !containerRef.current) {
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
            console.log('DFlipViewer: PDF 加载完成')
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
      <div className="text-center text-muted py-5">
        <i className="bi bi-file-earmark-pdf fs-1 d-block mb-2"></i>
        <p>未提供PDF文件</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    )
  }

  return (
    <div className="dflip-viewer-container" style={{ width: '100%', minHeight: '600px' }}>
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">加载中...</span>
          </div>
          <p className="mt-2 text-muted">正在加载PDF...</p>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%' }}></div>
    </div>
  )
}

export default DFlipViewer

