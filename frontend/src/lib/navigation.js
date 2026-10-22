import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/router'

export { Link }

export function useNavigate() {
  const router = useRouter()
  return (url, as, options) => router.push(url, as, options)
}

export function useLocation() {
  const router = useRouter()
  return { pathname: router.asPath.split('?')[0] || '/' }
}

export function useSearchParams() {
  const router = useRouter()
  const query = router.asPath.split('?')[1] || ''
  return useMemo(() => [new URLSearchParams(query)], [query])
}

export function useParams() {
  const router = useRouter()
  const parts = Array.isArray(router.query.path) ? router.query.path : []
  return {
    id: parts[1],
    categoryId: parts[2],
  }
}
