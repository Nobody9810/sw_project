import React, { useEffect, useRef, useState } from 'react'
import { FileText, AlertTriangle, Loader } from 'lucide-react'

function DFlipViewer({ fileUrl }) {
  const containerRef = useRef(null)
  const dflipInstanceRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 处理URL
  const pdfUrl = React.useMemo(() => {
    if (!fileUrl) return null
    if (fileUrl.startsWith('http') || fileUrl.startsWith('/')) return fileUrl
    return `/media/${fileUrl}`
  }, [fileUrl])

  useEffect(() => {
    let isMounted = true
    let timeoutId = null

    // 检查全局依赖
    const checkDependencies = () => {
      // 检查 jQuery
      if (!window.jQuery) {
        console.warn('DFlipViewer: jQuery 未加载')
        return false
      }
      return true
    }

    if (!pdfUrl) {
      setLoading(false)
      return
    }

    // 清理旧实例
    const cleanup = () => {
      if (dflipInstanceRef.current && typeof dflipInstanceRef.current.dispose === 'function') {
        dflipInstanceRef.current.dispose()
        dflipInstanceRef.current = null
      }
      if (containerRef.current && window.jQuery) {
        window.jQuery(containerRef.current).empty()
      }
    }

    cleanup()
    setLoading(true)
    setError(null)

    // 初始化 DFlip
    const initDFlip = () => {
      if (!isMounted) return

      if (!checkDependencies()) {
        setError('系统组件(jQuery)未加载，请刷新页面重试')
        setLoading(false)
        return
      }

      // 动态加载 DFLIP 脚本（如果尚未存在）
      // 实际项目中建议在 index.html 头部引入 dflip.min.css 和 dflip.min.js
      // 这里假设已经引入，直接检查是否可用
      
      const $container = window.jQuery(containerRef.current)
      const containerId = `dflip-${Date.now()}`
      $container.attr('id', containerId)

      // 检查 flipBook 插件是否就绪
      if (typeof $container.flipBook !== 'function') {
         // 尝试简单的重试机制
         setTimeout(() => {
            if (isMounted && typeof window.jQuery(containerRef.current).flipBook === 'function') {
                initDFlip()
            } else {
                if(isMounted) {
                    setError('阅读器组件加载失败，请检查网络或刷新')
                    setLoading(false)
                }
            }
         }, 1000)
         return
      }

      try {
        const options = {
          height: '100%',
          duration: 800,
          backgroundColor: 'transparent',
          webgl: true, // 启用 3D 效果
          forceFit: true,
          autoEnableOutline: false,
          autoEnableThumbnail: false,
          // 关键：确保 worker 路径正确，如果你的路径不同请修改这里
          pdfjsSrc: '/assets/dflip/js/libs/pdf.min.js',
          pdfjsCompatibilitySrc: '/assets/dflip/js/libs/compatibility.js',
          pdfjsWorkerSrc: '/assets/dflip/js/libs/pdf.worker.min.js',
          threejsSrc: '/assets/dflip/js/libs/three.min.js',
          mockupIncSrc: '/assets/dflip/js/libs/mockup.min.js',
          
          onReady: (scene) => {
            if (isMounted) setLoading(false)
          },
          onError: (e) => {
             console.error('DFlip 错误:', e)
             // 只有当加载时间过长还未 ready 时才显示错误
          }
        }

        const flipbook = $container.flipBook(pdfUrl, options)
        dflipInstanceRef.current = flipbook
        
        // 设置超时保护，如果15秒还没加载完，提示用户
        timeoutId = setTimeout(() => {
            if (isMounted && loading) {
                // 不一定真的失败，可能是文件太大，只提示不中断
                // setLoading(false) 
            }
        }, 15000)

      } catch (err) {
        console.error('DFlipViewer 初始化异常:', err)
        if (isMounted) {
          setError('阅读器初始化错误')
          setLoading(false)
        }
      }
    }

    // 稍微延迟初始化，确保 DOM 渲染完成
    const timer = setTimeout(initDFlip, 100)

    return () => {
      isMounted = false
      clearTimeout(timer)
      if (timeoutId) clearTimeout(timeoutId)
      cleanup()
    }
  }, [pdfUrl])

  if (!pdfUrl) {
    return <div className="text-center py-8 text-gray-500">未提供文档</div>
  }

  return (
    <div className="relative w-full" style={{ height: '600px', minHeight: '50vh' }}>
      {/* 错误提示 */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
           <div className="text-center text-red-500">
             <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
             <p>{error}</p>
             <p className="text-sm text-gray-400 mt-2">请尝试刷新页面</p>
           </div>
        </div>
      )}

      {/* Loading 遮罩 - 覆盖在 Viewer 上面，加载完成后消失 */}
      {loading && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <Loader className="w-8 h-8 animate-spin text-green-600 mb-2" />
          <p className="text-gray-600 dark:text-gray-300">正在加载文档...</p>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full"></div>
    </div>
  )
}

export default DFlipViewer
