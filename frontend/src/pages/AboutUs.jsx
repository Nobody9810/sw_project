import React, { useEffect } from 'react'

function AboutUs() {
  useEffect(() => {
    const sections = document.querySelectorAll('.scroll-reveal')
    const handleScroll = () => {
      sections.forEach(section => {
        const rect = section.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.85) {
          section.classList.add('visible')
        }
      })
    }
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="about-us-container">
      <div className="about-banner">
        <h1>关于书味</h1>
        <p className="subtitle">传承文化 · 分享智慧</p>
      </div>

      <div className="about-content">
        <section className="mission-section scroll-reveal">
          <div className="section-content">
            <h2>我们的使命</h2>
            <p>书味网致力于构建一个思维的开阔之地，品读传世经典，保存微光火种，让哲思灵源不期而遇、共振以鸣。</p>
          </div>
          <div className="section-image">
            <img src="/static/images/contact_us.jpg" alt="我们的使命" />
          </div>
        </section>

        <section className="story-section scroll-reveal">
          <div className="section-image">
            <img src="/static/images/about_us_3.jpg" alt="我们的故事" />
          </div>
          <div className="section-content">
            <h2>我们的故事</h2>
            <blockquote>
              客散茶甘留舌本，睡馀书味在胸中。
              <footer>——宋·陆游《晚兴》</footer>
            </blockquote>
            <p>这是这个故事的起点，一群人慕名而来，围坐在一起，愉快地喝茶读书。承蒙主恩，在因我们的阅历而显得有限的书页上，因为老师的解读，一幅如大海般宽广的书卷平躺在历史的长河中，无限地延展开来。</p>
            <p>在这幅书卷中，我们居然也浅显地触碰到"那横卧着的整个过去的灵魂"，也开始在小我中长出比较宽广的理想，开始有了在未来留下些对世界有益的些微的痕迹的希冀。</p>
          </div>
        </section>

        <section className="vision-section scroll-reveal">
          <div className="section-content">
            <h2>我们的愿景</h2>
            <p>这些对过去的思考、对现状的无力和挣扎着对未来产生的希望掺杂在一起，产生了想"为我们的Ummah做点什么"的意愿。带着这样目前看来还有点遥远的愿望，我们来到了你的面前。</p>
            <p>你就是我们千里之行始于足下的第一步，我们想和你，和更多的人一起迈出下一步，一步一个脚印，一起读书，一起在"每一条真理面前停留"，一起为这个最好和最坏的时代，留下一些痕迹，并让它传承下去。</p>
          </div>
          <div className="section-image1">
            <img src="/static/images/about_us_2.png" alt="我们的愿景" />
          </div>
        </section>
      </div>
    </div>
  )
}

export default AboutUs

