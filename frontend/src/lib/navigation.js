import NextLink from 'next/link'
import { createElement, useMemo } from 'react'
import { useRouter } from 'next/router'
import { isShallowNavigation } from './routes'

/** @param {import('react').ComponentProps<typeof NextLink>} props */
export function Link({ shallow, ...props }) {
  const { asPath } = useRouter()
  return createElement(NextLink, { ...props, shallow: shallow ?? isShallowNavigation(props.href, asPath) })
}

export function useNavigate() {
  const router = useRouter()
  return (url, as, options) => router.push(url, as, {
    ...options,
    shallow: options?.shallow ?? (!as && isShallowNavigation(url, router.asPath)),
  })
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
