import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PDFThumbnail from './PDFThumbnail'

const BookCarousel = ({ books = [], itemsPerSlide = 5 }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const carouselRef = useRef(null)
  const autoplayRef = useRef(null)

  // 将书籍数组分组成多个幻灯片
  const slides = []
  for (let i = 0; i < books.length; i += itemsPerSlide) {
    slides.push(books.slice(i, i + itemsPerSlide))
  }

  const totalSlides = slides.length

  // 自动播放
  useEffect(() => {
    if (totalSlides <= 1) return

    const startAutoplay = () => {
      autoplayRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % totalSlides)
      }, 5000) // 每5秒切换一次
    }

    startAutoplay()

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current)
      }
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
    // 重置自动播放
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current)
      autoplayRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % totalSlides)
      }, 5000)
    }
  }

  const goPrev = () => {
    if (isTransitioning) return
    goToSlide((currentIndex - 1 + totalSlides) % totalSlides)
  }

  const goNext = () => {
    if (isTransitioning) return
    goToSlide((currentIndex + 1) % totalSlides)
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-gray-500 dark:text-gray-400">暂无图书</p>
      </div>
    )
  }

  return (
    <div className="relative w-full p-0 my-4 max-w-full box-border" ref={carouselRef}>
      <div className="relative w-full overflow-hidden rounded-xl">
        <div 
          className="flex w-full will-change-transform"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isTransitioning ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
          }}
        >
          {slides.map((slide, slideIndex) => (
            <div key={slideIndex} className="min-w-full flex-shrink-0" style={{ width: '100%' }}>
              <div className="grid gap-2 py-2 w-full
                              grid-cols-5
                              max-sm:grid-cols-3">
                {slide.map(book => (
                  <div 
                    key={book.id} 
                    className="group relative w-full min-w-0 aspect-[2/3] max-h-[240px] 
                               max-sm:max-h-[180px]
                               rounded-lg overflow-hidden 
                               shadow-[0_2px_8px_rgba(0,0,0,0.1)] 
                               dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
                               transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                               bg-white dark:bg-[#2a2a2a]
                               hover:-translate-y-1 hover:scale-[1.01] hover:z-10
                               hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)]
                               dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                  >
                    <Link 
                      to={`/书库/${book.id}`} 
                      className="block w-full h-full no-underline text-inherit"
                    >
                      <div className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-[#1a1a1a]">
                        {book.文档 ? (
                          <div className="w-full h-full relative">
                            <PDFThumbnail 
                              pdfUrl={book.文档} 
                              alt={book.标题}
                              onError={(err) => {
                                console.error(`PDF缩略图加载失败 (${book.标题}):`, err, 'URL:', book.文档)
                              }}
                            />
                          </div>
                        ) : (
                          <img
                            src={book.图片 || '/assets/images/default-placeholder.png'}
                            alt={book.标题}
                            loading="lazy"
                            className="w-full h-full object-contain transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-105"
                            onError={(e) => {
                              e.target.src = '/assets/images/default-placeholder.png'
                            }}
                          />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 
                                        bg-gradient-to-t from-black/90 via-black/70 to-transparent 
                                        px-3 pt-4 pb-3 
                                        translate-y-full 
                                        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                                        pointer-events-none
                                        group-hover:translate-y-0">
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
        <div className="flex justify-center items-center gap-2 p-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`h-2.5 rounded-full border-none cursor-pointer transition-all duration-300 ease-in-out p-0
                         ${index === currentIndex 
                           ? 'w-6 h-2.5 rounded-[5px] bg-[#fd7e14] shadow-[0_2px_8px_rgba(253,126,20,0.4)]' 
                           : 'w-2.5 bg-black/20 dark:bg-white/20 hover:bg-[#fd7e14]/50 hover:scale-110'
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

