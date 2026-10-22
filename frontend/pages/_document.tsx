import { Head, Html, Main, NextScript } from 'next/document'
import { themeInitializationScript } from '@/lib/themeUtils'
import { sidebarInitializationScript } from '@/lib/contentSidebar'

export default function Document() {
  return (
    <Html lang="zh-CN" suppressHydrationWarning>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarInitializationScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
