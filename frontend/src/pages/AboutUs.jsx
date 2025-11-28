import React, { useEffect, useRef } from 'react'

function AboutUs() {
  const missionRef = useRef(null)
  const storyRef = useRef(null)
  const visionRef = useRef(null)

  useEffect(() => {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -100px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0')
          entry.target.classList.remove('opacity-0', 'translate-y-8')
        }
      })
    }, observerOptions)

    const refs = [missionRef, storyRef, visionRef]
    refs.forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    return () => {
      refs.forEach(ref => {
        if (ref.current) {
          observer.unobserve(ref.current)
        }
      })
    }
  }, [])

  return (
    <div className="w-full overflow-hidden font-serif">
      {/* Banner Section */}
      <div 
        className="relative h-[450px] flex flex-col justify-center items-center text-white text-center mb-8"
        style={{
          background: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(/assets/images/about_us_1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
        <h1 className="text-6xl md:text-7xl mb-4 text-white font-bold tracking-wider drop-shadow-lg relative z-10">
          关于书味
        </h1>
        <p className="text-2xl md:text-3xl opacity-90 font-medium tracking-wide text-gray-200 relative z-10">
          传承文化 · 分享智慧
        </p>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        {/* Mission Section */}
        <section 
          ref={missionRef}
          className="flex flex-col md:flex-row items-center gap-12 md:gap-16 mb-24 md:mb-32 px-4 md:px-8 py-8 relative transition-all duration-700 ease-out opacity-0 translate-y-8"
        >
          <div className="absolute top-0 left-[-100%] right-[-100%] h-full bg-gray-50 dark:bg-gray-900/20 -z-10"></div>
          
          <div className="flex-1 relative">
            <h2 className="text-3xl md:text-4xl mb-8 text-gray-800 dark:text-gray-100 font-semibold relative pb-4">
              我们的使命
              <span className="absolute bottom-0 left-0 w-16 h-1 bg-orange-500"></span>
            </h2>
            <p className="text-lg md:text-xl leading-relaxed mb-6 text-gray-700 dark:text-gray-300 text-justify">
              书味网致力于构建一个思维的开阔之地，品读传世经典，保存微光火种，让哲思灵源不期而遇、共振以鸣。
            </p>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <img 
              src="/assets/images/contact_us.jpg" 
              alt="我们的使命" 
              className="w-full h-[400px] object-cover rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105"
            />
          </div>
        </section>

        {/* Story Section */}
        <section 
          ref={storyRef}
          className="flex flex-col md:flex-row-reverse items-center gap-12 md:gap-16 mb-24 md:mb-32 px-4 md:px-8 py-8 relative transition-all duration-700 ease-out opacity-0 translate-y-8"
        >
          <div className="absolute top-0 left-[-100%] right-[-100%] h-full bg-gray-50 dark:bg-gray-900/20 -z-10"></div>
          
          <div className="flex-1 relative overflow-hidden">
            <img 
              src="/assets/images/about_us_3.jpg" 
              alt="我们的故事" 
              className="w-full h-[400px] object-cover rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105"
            />
          </div>
          
          <div className="flex-1 relative">
            <h2 className="text-3xl md:text-4xl mb-8 text-gray-800 dark:text-gray-100 font-semibold relative pb-4">
              我们的故事
              <span className="absolute bottom-0 left-0 w-16 h-1 bg-orange-500"></span>
            </h2>
            
            <blockquote className="italic py-8 px-8 md:px-12 border-l-4 border-orange-500 my-8 bg-orange-50 dark:bg-orange-900/10 rounded-r-2xl relative">
              <span className="absolute top-2 left-5 text-6xl text-orange-200 dark:text-orange-900/30 font-serif leading-none">"</span>
              <p className="text-lg md:text-xl leading-relaxed text-gray-700 dark:text-gray-300 relative z-10">
                客散茶甘留舌本，睡馀书味在胸中。
              </p>
              <footer className="mt-4 text-base text-right text-gray-500 dark:text-gray-400 relative z-10">
                ——宋·陆游《晚兴》
              </footer>
            </blockquote>
            
            <p className="text-lg md:text-xl leading-relaxed mb-6 text-gray-700 dark:text-gray-300 text-justify">
              这是这个故事的起点，一群人慕名而来，围坐在一起，愉快地喝茶读书。承蒙主恩，在因我们的阅历而显得有限的书页上，因为老师的解读，一幅如大海般宽广的书卷平躺在历史的长河中，无限地延展开来。
            </p>
            <p className="text-lg md:text-xl leading-relaxed mb-6 text-gray-700 dark:text-gray-300 text-justify">
              在这幅书卷中，我们居然也浅显地触碰到"那横卧着的整个过去的灵魂"，也开始在小我中长出比较宽广的理想，开始有了在未来留下些对世界有益的些微的痕迹的希冀。
            </p>
          </div>
        </section>

        {/* Vision Section */}
        <section 
          ref={visionRef}
          className="flex flex-col md:flex-row items-center gap-12 md:gap-16 mb-24 md:mb-32 px-4 md:px-8 py-8 relative transition-all duration-700 ease-out opacity-0 translate-y-8"
        >
          <div className="absolute top-0 left-[-100%] right-[-100%] h-full bg-gray-50 dark:bg-gray-900/20 -z-10"></div>
          
          <div className="flex-1 relative">
            <h2 className="text-3xl md:text-4xl mb-8 text-gray-800 dark:text-gray-100 font-semibold relative pb-4">
              我们的愿景
              <span className="absolute bottom-0 left-0 w-16 h-1 bg-orange-500"></span>
            </h2>
            <p className="text-lg md:text-xl leading-relaxed mb-6 text-gray-700 dark:text-gray-300 text-justify">
              这些对过去的思考、对现状的无力和挣扎着对未来产生的希望掺杂在一起，产生了想"为我们的Ummah做点什么"的意愿。带着这样目前看来还有点遥远的愿望，我们来到了你的面前。
            </p>
            <p className="text-lg md:text-xl leading-relaxed mb-6 text-gray-700 dark:text-gray-300 text-justify">
              你就是我们千里之行始于足下的第一步，我们想和你，和更多的人一起迈出下一步，一步一个脚印，一起读书，一起在"每一条真理面前停留"，一起为这个最好和最坏的时代，留下一些痕迹，并让它传承下去。
            </p>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <img 
              src="/assets/images/about_us_2.png" 
              alt="我们的愿景" 
              className="w-full h-[400px] object-cover rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export default AboutUs
