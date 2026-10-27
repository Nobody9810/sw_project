import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import NextPageShell from '@/router/NextPageShell'
import { classifyRoute, sameRouteParts } from '@/lib/routes'
import { articlePath, articleSlug } from '@/lib/articleUrl'
import type { ArticleData } from '@/types/content'
import { articleShareData, articleShareImage } from '@/lib/articleShare'

type Props = {
  routeParts: string[]
  initialArticle: ArticleData | null
  initialError: string
  canonicalUrl: string
  shareImage?: string
}

export default function CatchAllPage(serverProps: Props) {
  const router = useRouter()
  const currentParts = Array.isArray(router.query.path) ? router.query.path : []
  // Client navigation is shallow, so server props may describe an earlier page.
  const props: Props = sameRouteParts(serverProps.routeParts, currentParts) ? serverProps : {
    routeParts: currentParts,
    initialArticle: null,
    initialError: '',
    canonicalUrl: new URL(router.asPath.split(/[?#]/)[0], serverProps.canonicalUrl).href,
  }
  const article = props.initialArticle
  const share = articleShareData(article, props.routeParts[0])
  const title = article ? `${share.title} — 書味` : '書味'
  const description = share.description
  const image = props.shareImage || articleShareImage(article, props.canonicalUrl)
  return (
    <>
      <Head>
        <title>{title}</title>
        <link rel="canonical" href={props.canonicalUrl} />
        <meta property="og:url" content={props.canonicalUrl} />
        <meta name="description" content={description} />
        <meta property="og:title" content={title} key="og-title" />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={article ? 'article' : 'website'} />
        <meta property="og:site_name" content="書味" />
        <meta property="og:locale" content="zh_CN" />
        {share.author && <meta name="author" content={share.author} />}
        {image && <meta property="og:image" content={image} />}
        {image && <meta property="og:image:alt" content={share.title} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {image && <meta name="twitter:image" content={image} />}
        {image && <meta name="twitter:image:alt" content={share.title} />}
      </Head>
      <NextPageShell {...props} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res, req, resolvedUrl }) => {
  const routeParts = Array.isArray(params?.path) ? params.path : []
  const kind = classifyRoute(routeParts)
  if (kind === 'notFound') return { notFound: true }
  const forwardedProto = String(req?.headers['x-forwarded-proto'] || '').split(',')[0]
  const protocol = forwardedProto === 'https' ? 'https' : 'http'
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${req?.headers.host || 'localhost:3000'}`
  const canonicalUrl = new URL(`/${routeParts.map(encodeURIComponent).join('/')}${routeParts.length ? '/' : ''}`, origin).href
  const props: Props = { routeParts, initialArticle: null, initialError: '', canonicalUrl }
  if (kind === 'article') {
    try {
      const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
      const publicOrigin = new URL(origin)
      const response = await fetch(`${backend}/api/${encodeURIComponent(routeParts[0])}/${routeParts[1]}/?public=1`, {
        signal: AbortSignal.timeout(10000),
        // Preserve the public origin when bypassing Nginx over private HTTP.
        // Django validates the host and may enforce HTTPS behind its proxy.
        headers: {
          Host: publicOrigin.host,
          'X-Forwarded-Host': publicOrigin.host,
          'X-Forwarded-Proto': publicOrigin.protocol.slice(0, -1),
        },
      })
      if (response.status === 404) return { notFound: true }
      if (!response.ok) throw new Error(`Backend HTTP ${response.status}`)
      props.initialArticle = await response.json()
      // Django sees the internal backend host. Keep media URLs usable by browsers.
      for (const key of ['图片', '文档']) {
        const value = props.initialArticle?.[key]
        if (typeof value === 'string') {
          try {
            const url = new URL(value, backend)
            if (url.origin === new URL(backend).origin && url.pathname.startsWith('/media/')) {
              props.initialArticle![key] = `${url.pathname}${url.search}`
            }
          } catch { /* A malformed optional media URL must not hide the article. */ }
        }
      }
      // Detail counters/reaction status are personalized during hydration.
      res.setHeader('Cache-Control', 'private, no-store')
      if (props.initialArticle?.标题) {
        const path = articlePath(routeParts[0], props.initialArticle)
        props.canonicalUrl = new URL(path, origin).href
        if (routeParts[2] !== articleSlug(props.initialArticle.标题)) {
          const queryStart = resolvedUrl?.indexOf('?') ?? -1
          const query = queryStart >= 0 ? resolvedUrl.slice(queryStart) : ''
          // ID always identifies the article. Refresh display titles without
          // permanently caching a redirect that could become stale after edits.
          return { redirect: { destination: path + query, permanent: false } }
        }
      }
      props.shareImage = articleShareImage(props.initialArticle, props.canonicalUrl, backend)
    } catch {
      res.statusCode = 503
      props.initialError = '文章暂时无法加载，请稍后重试'
    }
  }
  return { props }
}
