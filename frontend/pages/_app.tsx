import PrayerLocationNotice from '@/features/prayers/PrayerLocationNotice'
import { PrayerToolsProvider } from '@/features/prayers/PrayerToolsContext'
import PrayerToolsDialog from '@/features/prayers/PrayerToolsDialog'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import '@/styles/globals.css'
import { ReadingToolsProvider } from '@/components/common/ReadingToolsContext'
import { AuthProvider } from '@/features/auth/AuthContext'
import FloatingTools from '@/components/layout/FloatingTools'
import ReleaseNotice from '@/features/updates/ReleaseNotice'

export default function FrontendApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>{'\u66f8\u5473'}</title>
        <link rel="icon" href="/assets/images/logo-icon-black.png" />
      </Head>
      <AuthProvider>
      <ReadingToolsProvider>
      <PrayerToolsProvider>
        <Component {...pageProps} />
        <FloatingTools />
        <PrayerToolsDialog />
        <PrayerLocationNotice />
        <ReleaseNotice />
      </PrayerToolsProvider>
      </ReadingToolsProvider>
      </AuthProvider>
    </>
  )
}
