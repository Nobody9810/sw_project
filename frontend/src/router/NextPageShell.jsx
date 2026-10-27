import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import { articleTypes, classifyRoute, sameRouteParts } from '@/lib/routes'
import Layout from '@/components/layout/Layout'
import ScrollToTop from '@/components/layout/ScrollToTop'
import PageSkeleton from '@/components/common/PageSkeleton'
import { pageSkeleton } from '@/lib/pageSkeleton'
import { bookTypes } from '@/lib/contentLayout'
import RequestError from '@/components/common/RequestError'
import PageTransition from '@/components/common/PageTransition'
import { usePageReady } from '@/components/common/PageLoadContext'

const LoadingFallback = ({ error } = {}) => {
  const { asPath } = useRouter()
  usePageReady(!error)
  return error
    ? <div className="mx-auto w-full max-w-7xl px-4 py-8"><RequestError message="页面资源加载失败，请重新加载" onRetry={() => window.location.reload()} /></div>
    : <PageSkeleton {...pageSkeleton(asPath)} />
}

function ResolvedErrorPage() {
  usePageReady(false)
  return <ErrorPage statusCode={404} />
}

const PrayerTimesPage = dynamic(() => import('@/features/prayers/PrayerTimesPage'), { loading: LoadingFallback })
const UpdatesPage = dynamic(() => import('@/features/updates/UpdatesPage'), { loading: LoadingFallback })
const LoginPage = dynamic(() => import('@/features/auth/LoginPage'), { loading: LoadingFallback })
const HomePage = dynamic(() => import('@/features/content/pages/HomePage'), { loading: LoadingFallback })
const ArticleList = dynamic(() => import('@/features/content/pages/ArticleList'), { loading: LoadingFallback })
const ArticleDetail = dynamic(() => import('@/features/content/pages/ArticleDetail'), { loading: LoadingFallback })
const BookList = dynamic(() => import('@/features/content/pages/BookList'), { loading: LoadingFallback })
const BookReviewCategoryList = dynamic(() => import('@/features/content/pages/BookReviewCategoryList'), { loading: LoadingFallback })
const AboutUs = dynamic(() => import('@/features/content/pages/AboutUs'), { loading: LoadingFallback })
const Copyright = dynamic(() => import('@/features/content/pages/Copyright'), { loading: LoadingFallback })
const SearchResults = dynamic(() => import('@/features/content/pages/SearchResults'), { loading: LoadingFallback })
const QAPage = dynamic(() => import('@/features/content/pages/QAPage'), { loading: LoadingFallback })
const HadithDetailPage = dynamic(() => import('@/features/content/pages/HadisDetail'), { loading: LoadingFallback })


function CurrentPage({ routeParts, initialArticle, initialError }) {
  const router = useRouter()
  if (!routeParts && !router.isReady) return <LoadingFallback />

  const currentParts = Array.isArray(router.query.path) ? router.query.path : []
  // Shallow client navigation keeps the first page's server props.
  const serverPage = routeParts && (!router.isReady || sameRouteParts(routeParts, currentParts))
  const parts = serverPage ? routeParts : currentParts
  if (classifyRoute(parts) === 'notFound') return <ResolvedErrorPage />
  const [section, subSection, id] = parts

  if (!section) return <HomePage />
  if (section === '书评' && subSection === '分类' && id) return <BookReviewCategoryList key={id} />
  if (articleTypes.has(section) && subSection) return <ArticleDetail key={`${section}/${subSection}`} type={section} initialArticle={serverPage ? initialArticle : null} initialError={serverPage ? initialError : ''} />
  if (section === '登录') return <LoginPage />
  if (section === '更新说明') return <UpdatesPage />
  if (section === '问答') return <QAPage />
  if (section === '礼拜时间') return <PrayerTimesPage />
  if (section === '经训') return <HadithDetailPage />
  if (section === '关于我们') return <AboutUs />
  if (section === '版权声明') return <Copyright />
  if (section === '搜索') return <SearchResults key={router.asPath} />
  if (articleTypes.has(section)) return bookTypes.has(section) ? <BookList key={section} type={section} /> : <ArticleList key={section} type={section} />

  return <ResolvedErrorPage />
}

/** @param {{routeParts?: string[], initialArticle?: Record<string, unknown> | null, initialError?: string}} props */
export default function NextPageShell({ routeParts = undefined, initialArticle = null, initialError = '' }) {
  return (
    <>
      <ScrollToTop />
      <Layout>
        <PageTransition>
        <Suspense fallback={<LoadingFallback />}>
          <CurrentPage routeParts={routeParts} initialArticle={initialArticle} initialError={initialError} />
        </Suspense>
        </PageTransition>
      </Layout>
    </>
  )
}
