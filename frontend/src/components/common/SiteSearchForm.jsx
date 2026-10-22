import { useId, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from '@/lib/navigation'

export default function SiteSearchForm({ initialValue = '', onSubmitted, className = '' }) {
  const [keyword, setKeyword] = useState(initialValue)
  const id = useId()
  const navigate = useNavigate()
  return <form role="search" className={className} onSubmit={event => {
    event.preventDefault()
    if (!keyword.trim()) return
    navigate(`/搜索?keyword=${encodeURIComponent(keyword.trim())}`)
    onSubmitted?.()
  }}>
    <label htmlFor={id} className="sr-only">搜索全站内容</label>
    <div className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 transition-colors focus-within:border-green-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-500/20 dark:border-night-700 dark:bg-night-900 dark:focus-within:border-sage-400 dark:focus-within:bg-night-900">
      <input id={id} type="search" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="搜索全站内容"
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-gray-900 outline-none dark:text-night-100" />
      <button type="submit" disabled={!keyword.trim()} aria-label="搜索" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-green-700 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-sage-400 dark:hover:bg-night-700"><Search className="h-5 w-5" aria-hidden="true" /></button>
    </div>
  </form>
}
