import { List } from 'lucide-react'

// Phone-only entry to the 经训 directory drawer, placed in the bottom bars within thumb reach.
export default function DirectoryButton({ onOpen, label = false }) {
  if (!onOpen) return null
  return <button type="button" onClick={onOpen} aria-label="打开经训目录" aria-controls="hadith-directory" title="经训目录"
    className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 shadow-sm transition-colors active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-night-700 dark:bg-night-800 dark:text-night-200 dark:active:bg-night-700 md:hidden ${label ? 'px-4' : 'w-11'}`}>
    <List className="h-5 w-5" aria-hidden="true" />{label && <span>目录</span>}
  </button>
}
