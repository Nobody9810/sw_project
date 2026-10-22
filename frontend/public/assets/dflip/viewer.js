/* Each viewer has its own document, timers, global listeners and PDF worker. */
(() => {
  let viewer
  let stopped = false
  const notify = type => {
    if (!stopped) window.parent.postMessage({ type }, window.location.origin)
  }
  const timeout = setTimeout(() => notify('dflip-error'), 30000)
  window.addEventListener('pagehide', () => {
    stopped = true
    clearTimeout(timeout)
    try { viewer?.dispose?.() } catch { /* Removing the iframe releases its document. */ }
    viewer = null
  }, { once: true })
  const start = () => {
    if (stopped) return
    try {
      const value = new URLSearchParams(window.location.search).get('file')
      if (!value) throw new Error('Missing PDF')
      const url = new URL(value, window.location.origin)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid PDF URL')
      if (!window.jQuery?.fn.flipBook) throw new Error('Reader scripts unavailable')
      if (!window.SW_READER_ICONS) throw new Error('Reader icons unavailable')
      viewer = window.jQuery('#reader').flipBook(url.href, {
        height: '100%', duration: 800, backgroundColor: 'transparent', webgl: true,
        forceFit: true, autoEnableOutline: false, autoEnableThumbnail: false,
        soundEnable: false, hideControls: 'thumbnail,sound',
        icons: window.SW_READER_ICONS,
        pdfjsSrc: '/assets/dflip/js/libs/pdf.min.js',
        pdfjsCompatibilitySrc: '/assets/dflip/js/libs/compatibility.js',
        pdfjsWorkerSrc: '/assets/dflip/js/libs/pdf.worker.min.js',
        threejsSrc: '/assets/dflip/js/libs/three.min.js',
        mockupjsSrc: '/assets/dflip/js/libs/mockup.min.js',
        cMapUrl: '/assets/dflip/js/libs/cmaps/',
        onReady: () => { clearTimeout(timeout); notify('dflip-ready') },
      })
    } catch (error) {
      console.error('PDF reader initialization failed', error)
      clearTimeout(timeout)
      notify('dflip-error')
    }
  }
  // DFlip configures its resource defaults in jQuery's document-ready callback.
  // Register after that callback so initialization uses the complete configuration.
  if (window.jQuery) window.jQuery(start)
  else start()
})()
