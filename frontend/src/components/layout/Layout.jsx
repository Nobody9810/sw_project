import React, { memo } from 'react'
import { Link } from '@/lib/navigation'
import Navbar from './Navbar'
import Footer from './Footer'
import TopSearchBar from './TopSearchBar'

const Layout = memo(function Layout({ children }) {

  return (
    <div className="site-layout relative flex min-h-screen w-full flex-col overflow-x-clip">
      <TopSearchBar />
      <div className="hidden w-full items-center justify-center bg-white py-6 text-center dark:bg-night-800 lg:flex">
        <Link href="/" className="inline-block text-center">
          <img src="/assets/images/logo_black.png" alt="书味网" className="mx-auto block h-[120px] w-auto dark:hidden" />
          <img src="/assets/images/logo_white.png" alt="书味网" className="mx-auto hidden h-[120px] w-auto dark:block" />
        </Link>
      </div>
      <Navbar />
      <main className="relative mx-auto mt-0 flex min-h-[calc(100vh-500px)] w-full max-w-[1200px] flex-[1_0_auto] flex-col px-5">
        {children}
      </main>
      <Footer />
    </div>
  )
})

export default Layout

