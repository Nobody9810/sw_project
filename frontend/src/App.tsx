import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import HomePage from './pages/HomePage'

// 代码分割：懒加载非关键页面
const ArticleList = lazy(() => import('./pages/ArticleList'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'))
const BookList = lazy(() => import('./pages/BookList'))
const BookReviewCategoryList = lazy(() => import('./pages/BookReviewCategoryList'))
const AboutUs = lazy(() => import('./pages/AboutUs'))
const Copyright = lazy(() => import('./pages/Copyright'))
const SearchResults = lazy(() => import('./pages/SearchResults'))
const QAPage = lazy(() => import('./pages/QAPage'))
const HadithDetailPage = lazy(() => import('./pages/HadisDetail'))

// 加载中占位组件
const LoadingFallback = () => (
  <div className="w-full min-h-[calc(100vh-500px)] flex items-center justify-center py-16">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
    </div>
  </div>
)



function App() {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/书讯" element={<BookList type="书讯" />} />
            <Route path="/书评/分类/:categoryId" element={<BookReviewCategoryList />} />
            <Route path="/书评" element={<ArticleList type="书评" />} />
            <Route path="/观点" element={<ArticleList type="观点" />} />
            <Route path="/译林" element={<ArticleList type="译林" />} />
            <Route path="/文艺" element={<ArticleList type="文艺" />} />
            <Route path="/文史" element={<ArticleList type="文史" />} />
            <Route path="/通讯" element={<ArticleList type="通讯" />} />
            <Route path="/论文" element={<BookList type="论文" />} />
            <Route path="/古籍" element={<BookList type="古籍" />} />
            <Route path="/书库" element={<BookList type="书库" />} />
            <Route path="/问答" element={<QAPage />} />
            <Route path="/经训" element={<HadithDetailPage />} />

            
            <Route path="/书讯/:id" element={<ArticleDetail type="书讯" />} />
            <Route path="/书评/:id" element={<ArticleDetail type="书评" />} />
            <Route path="/观点/:id" element={<ArticleDetail type="观点" />} />
            <Route path="/译林/:id" element={<ArticleDetail type="译林" />} />
            <Route path="/文艺/:id" element={<ArticleDetail type="文艺" />} />
            <Route path="/文史/:id" element={<ArticleDetail type="文史" />} />
            <Route path="/通讯/:id" element={<ArticleDetail type="通讯" />} />
            <Route path="/论文/:id" element={<ArticleDetail type="论文" />} />
            <Route path="/古籍/:id" element={<ArticleDetail type="古籍" />} />
            <Route path="/书库/:id" element={<ArticleDetail type="书库" />} />
            
            <Route path="/关于我们" element={<AboutUs />} />
            <Route path="/版权声明" element={<Copyright />} />
            <Route path="/搜索" element={<SearchResults />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App

