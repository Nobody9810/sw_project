import { articlePath } from '@/lib/articleUrl'
import React, { useState, useEffect, useRef } from 'react'
import { Link } from '@/lib/navigation'
import CoverImage from './CoverImage'


const BookCarousel = ({ books = [], itemsPerSlide = 5, desktopBookLimit = Infinity }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const carouselRef = useRef(null)
  const autoplayRef = useRef(null)
  const touchRef = useRef(null)
  const swipeRef = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)')
    const updateLayout = () => setIsMobile(!mediaQuery.matches)
    updateLayout()
    mediaQuery.addEventListener('change', updateLayout)
    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])

  // 手机端每页四本，两列两行；首页提供 12 本，分为三页。
  const slideSize = isMobile ? 4 : itemsPerSlide
  const visibleBooks = isMobile ? books : books.slice(0, desktopBookLimit)

  // 将书籍数组分组成多个幻灯片
  const slides = []
  for (let i = 0; i < visibleBooks.length; i += slideSize) {
    slides.push(visibleBooks.slice(i, i + slideSize))
  }

  const totalSlides = slides.length
  const activeIndex = Math.min(currentIndex, Math.max(0, totalSlides - 1))

  useEffect(() => {
    setCurrentIndex(0)
  }, [slideSize])

  // 自动播放逻辑
  useEffect(() => {
    if (totalSlides <= 1) return

    const startAutoplay = () => {
      // 清除可能存在的旧定时器
      if (autoplayRef.current) clearInterval(autoplayRef.current)
      
      autoplayRef.current = setInterval(() => {
        if (!document.hidden && !touchRef.current) { // 触摸期间暂停自动切页。
          setCurrentIndex(prev => (prev + 1) % totalSlides)
        }
      }, 5000)
    }

    startAutoplay()

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current)
    }
  }, [totalSlides])

  // 处理切换动画
  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 300)
    return () => clearTimeout(timer)
  }, [currentIndex])

  const goToSlide = (index) => {
    if (isTransitioning) return
    setCurrentIndex(index)
    // 重置自动播放计时器
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current)
      autoplayRef.current = setInterval(() => {
         if (!document.hidden && !touchRef.current) setCurrentIndex(prev => (prev + 1) % totalSlides)
      }, 5000)
    }
  }

  const handleTouchStart = (event) => {
    swipeRef.current = false
    if (!isMobile || totalSlides <= 1 || event.touches.length !== 1) return
    const touch = event.touches[0]
    touchRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchMove = (event) => {
    if (!touchRef.current) return
    if (event.touches.length !== 1) {
      touchRef.current = null
      return
    }
    const touch = event.touches[0]
    const dx = touch.clientX - touchRef.current.x
    const dy = touch.clientY - touchRef.current.y
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) swipeRef.current = true
  }

  const handleTouchEnd = (event) => {
    const start = touchRef.current
    touchRef.current = null
    if (!start || !event.changedTouches.length) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return
    swipeRef.current = true
    const nextIndex = Math.max(0, Math.min(totalSlides - 1, activeIndex + (dx < 0 ? 1 : -1)))
    if (nextIndex !== activeIndex) goToSlide(nextIndex)
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-gray-500 dark:text-night-400">暂无图书</p>
      </div>
    )
  }

  return (
    <div className="relative w-full p-0 my-4 max-w-full box-border" ref={carouselRef}>
      <div className="relative w-full overflow-hidden rounded-xl touch-pan-y sm:touch-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchRef.current = null }}
        onClickCapture={(event) => {
          if (swipeRef.current) {
            event.preventDefault()
            event.stopPropagation()
            swipeRef.current = false
          }
        }}>
        <div 
          className="flex w-full will-change-transform"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: isTransitioning ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
          }}
        >
          {slides.map((slide, slideIndex) => (
            <div key={slideIndex} className="min-w-full flex-shrink-0" style={{ width: '100%' }}>
              <div className="grid gap-2 py-2 w-full grid-cols-2 sm:grid-cols-5">
                {slide.map(book => (
                  <div 
                    key={book.id} 
                    className="group relative w-full min-w-0 aspect-[2/3] sm:max-h-[240px] 
                               
                               rounded-lg overflow-hidden 
                               shadow-[0_2px_8px_rgba(0,0,0,0.1)] 
                               dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
                               transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                               bg-white dark:bg-night-800
                               hover:-translate-y-1 hover:scale-[1.01] hover:z-10
                               hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)]
                               dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                  >
                    <Link 
                      href={articlePath("书库", book)} 
                      className="block w-full h-full no-underline text-inherit"
                    >
                      <div className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-night-900">
                        {/* 核心修改：
                           无论是否有文档，都只显示图片。
                           后端应该保证：如果有PDF，会自动生成第一页作为图片。
                           如果后端还没生成，就显示默认图，绝不要在列表页渲染PDF。
                        */}
                        <CoverImage src={book.图片} alt={book.标题} kind="book" label="书库" loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-105"
                          placeholderClassName="h-full w-full" />
                        
                        <div className="absolute bottom-0 left-0 right-0 
                                        bg-gradient-to-t from-black/90 via-black/70 to-transparent 
                                        px-3 pt-4 pb-3 
                                        sm:translate-y-full 
                                        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                                        pointer-events-none
                                        sm:group-hover:translate-y-0 sm:group-focus-within:translate-y-0">
                          <div className="text-white">
                            <h4 className="text-[0.95rem] sm:text-[0.85rem] font-semibold mb-2 leading-tight 
                                          line-clamp-2 overflow-hidden text-ellipsis">
                              {book.标题}
                            </h4>
                            {book.作者 && (
                              <p className="text-[0.85rem] sm:text-[0.75rem] m-0 text-white/90 italic 
                                          overflow-hidden text-ellipsis whitespace-nowrap">
                                {book.作者}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 指示器 */}
      {totalSlides > 1 && (
        <div className="flex justify-center items-center gap-2 p-2 mt-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`h-1.5 rounded-full border-none cursor-pointer transition-all duration-300 ease-in-out p-0
                         ${index === activeIndex 
                           ? 'w-6 bg-green-500' 
                           : 'w-2 bg-gray-300 dark:bg-night-600 hover:bg-green-400'
                         }`}
              onClick={() => goToSlide(index)}
              aria-label={`跳转到第 ${index + 1} 页`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default BookCarousel
