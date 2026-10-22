import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import PageSkeleton from './PageSkeleton'
import { pageSkeleton } from '@/lib/pageSkeleton'
import { PageLoadContext } from './PageLoadContext'
import { createPageTransition } from '@/lib/pageTransition'

export default function PageTransition({ children }) {
  const { events } = useRouter()
  const [pending, setPending] = useState(null)
  const controllerRef = useRef(null)
  if (!controllerRef.current) controllerRef.current = createPageTransition(setPending)
  const controller = controllerRef.current
  useEffect(() => {
    events.on('routeChangeStart', controller.start)
    events.on('routeChangeComplete', controller.complete)
    events.on('routeChangeError', controller.fail)
    return () => {
      events.off('routeChangeStart', controller.start)
      events.off('routeChangeComplete', controller.complete)
      events.off('routeChangeError', controller.fail)
    }
  }, [events, controller])
  const shape = pending ? pageSkeleton(pending.url) : null
  return <PageLoadContext.Provider value={{ pending, ready: controller.ready }}>
    {pending && <PageSkeleton {...shape} />}
    <div hidden={pending !== null} className="w-full">{children}</div>
  </PageLoadContext.Provider>
}
