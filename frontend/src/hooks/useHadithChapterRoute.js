import { useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { hadithChapterTarget } from '@/features/content/data/hadithNavigation'
import useBeforePaintEffect from './useBeforePaintEffect'

export default function useHadithChapterRoute(openChapter, showAllCollections) {
  const router = useRouter()
  const collection = router.query.collection
  const chapter = router.query.chapter
  const hadith = router.query.hadith
  const linked = useRef(false)
  const target = hadithChapterTarget(collection, chapter, hadith)
  const key = target ? JSON.stringify(target) : ''
  const [applied, setApplied] = useState('')

  useBeforePaintEffect(() => {
    if (!router.isReady) return
    const target = hadithChapterTarget(collection, chapter, hadith)
    if (target) {
      linked.current = true
      if (target.hadith) openChapter(target.collection, target.chapter, target.hadith)
      else openChapter(target.collection, target.chapter)
    } else if (linked.current) {
      linked.current = false
      showAllCollections()
    }
    setApplied(key)
  }, [router.isReady, collection, chapter, hadith, key, openChapter, showAllCollections])
  return Boolean(router.isReady && key && applied !== key)
}
