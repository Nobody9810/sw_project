import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './BookCarousel.css'

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
      <div className="book-carousel-empty">
        <p className="text-muted">暂无图书</p>
      </div>
    )
  }

  return (
    <div className="book-carousel-container" ref={carouselRef}>
      <div className="book-carousel-wrapper">
        <div 
          className="book-carousel-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isTransitioning ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
          }}
        >
          {slides.map((slide, slideIndex) => (
            <div key={slideIndex} className="book-carousel-slide">
              <div className="book-carousel-items">
                {slide.map(book => (
                  <div key={book.id} className="book-carousel-item">
                    <Link to={`/书库/${book.id}`} className="book-carousel-link">
                      <div className="book-carousel-cover">
                        <img
                          src={book.图片 || '/static/images/default-placeholder.png'}
                          alt={book.标题}
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = '/static/images/default-placeholder.png'
                          }}
                        />
                        <div className="book-carousel-overlay">
                          <div className="book-carousel-info">
                            <h4 className="book-carousel-title">{book.标题}</h4>
                            {book.作者 && (
                              <p className="book-carousel-author">{book.作者}</p>
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

      {/* 导航按钮 */}


      {/* 指示器 */}
      {totalSlides > 1 && (
        <div className="book-carousel-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`book-carousel-indicator ${index === currentIndex ? 'active' : ''}`}
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

