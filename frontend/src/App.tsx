import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import HomePage from './pages/HomePage'
import ArticleList from './pages/ArticleList'
import ArticleDetail from './pages/ArticleDetail'
import BookList from './pages/BookList'
import AboutUs from './pages/AboutUs'
import Copyright from './pages/Copyright'
import SearchResults from './pages/SearchResults'
import QAPage from './pages/QAPage'
import HadithDetailPage from './pages/HadisDetail'



function App() {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/书讯" element={<BookList type="书讯" />} />
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
      </Layout>
    </Router>
  )
}

export default App

