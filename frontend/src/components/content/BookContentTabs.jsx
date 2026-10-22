import { useEffect, useRef, useState } from 'react'
import { Book, UserCircle, List, MessageSquare } from 'lucide-react'
import DFlipViewer from '@/components/pdf/DFlipViewer'
import RichText from './RichText'
import { NEWS_BOOK_TABS, NEWS_BOOK_TAB } from '@/lib/contentLayout'

const TABS = [
  { key: '内容', title: '图书简介', icon: Book },
  { key: '作者简介', title: '作者简介', icon: UserCircle },
  { key: '目录', title: '目录', icon: List },
  { key: '前言', title: '前言', icon: MessageSquare },
]

export default function BookContentTabs({ sections, tabs = TABS, defaultTab = '内容', fileUrl, variant = 'news', activeTab, onTabChange }) {
  const [selectedKey, setSelectedKey] = useState(defaultTab)
  const activeKey = activeTab ?? selectedKey
  const [readerOpened, setReaderOpened] = useState(defaultTab === '在线阅读')
  const [vertical, setVertical] = useState(false)
  useEffect(() => {
    if (variant !== 'library') return
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setVertical(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [variant])
  const showReader = readerOpened || activeKey === '在线阅读'
  useEffect(() => {
    if (activeKey === '在线阅读') setReaderOpened(true)
  }, [activeKey])
  const buttons = useRef([])
  const section = sections.find(item => item.key === activeKey)
  const currentTab = tabs.find(tab => tab.key === activeKey) || tabs[0]

  const selectTab = key => {
    setSelectedKey(key)
    onTabChange?.(key)
    if (key === '在线阅读') setReaderOpened(true)
  }

  const handleKeyDown = (event, index) => {
    let next
    if (event.key === 'ArrowRight' || (vertical && event.key === 'ArrowDown')) next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft' || (vertical && event.key === 'ArrowUp')) next = (index + tabs.length - 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    selectTab(tabs[next].key)
    buttons.current[next]?.focus()
  }

  return (
    <div className={variant === 'library' ? 'grid min-w-0 gap-6 md:grid-cols-[7.5rem_minmax(0,1fr)] md:gap-8' : 'mb-10'}>
      <div role="tablist" aria-label="图书内容" aria-orientation={vertical ? 'vertical' : 'horizontal'} className={variant === 'library' ? 'grid grid-cols-3 self-start border-b border-gray-200 dark:border-night-700 md:grid-cols-1 md:gap-2 md:border-0' : NEWS_BOOK_TABS}>
        {tabs.map((tab, index) => {
          const selected = activeKey === tab.key
          const Icon = tab.icon
          return (
          <button key={tab.key} type="button" role="tab" id={`book-tab-${tab.key}`}
            aria-selected={activeKey === tab.key} aria-controls="book-content-panel"
            tabIndex={activeKey === tab.key ? 0 : -1}
            ref={element => { buttons.current[index] = element }}
            onClick={() => selectTab(tab.key)} onKeyDown={event => handleKeyDown(event, index)}
            className={variant === 'library'
              ? `inline-flex items-center justify-center gap-1.5 border-b-2 px-1 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 md:justify-start md:gap-2 md:border-b-0 md:border-l-2 md:pl-3 ${selected ? 'border-green-700 font-semibold text-green-700 dark:border-sage-400 dark:text-sage-400' : 'border-transparent text-gray-500 hover:text-green-600 dark:text-night-400 dark:hover:text-sage-400'}`
              : `${NEWS_BOOK_TAB} transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 ${selected ? 'border-green-600 font-semibold text-green-700 dark:text-sage-400' : 'border-transparent text-gray-500 hover:text-green-600 dark:text-night-400 dark:hover:text-sage-400'}`}>
            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {tab.title}
          </button>
          )
        })}
      </div>

      <section role="tabpanel" id="book-content-panel" aria-labelledby={`book-tab-${activeKey}`} tabIndex={0}
        className={`min-h-40 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 ${variant === 'library' ? 'md:border-l md:border-gray-200 md:pl-8 md:dark:border-night-700' : ''}`}>
        {showReader && fileUrl && (
          <div hidden={activeKey !== '在线阅读'}>
            <DFlipViewer fileUrl={fileUrl} />
          </div>
        )}
        {activeKey === '在线阅读' ? (
          !fileUrl && <p className="py-6 text-sm text-gray-500 dark:text-night-400">暂未提供在线阅读文档</p>
        ) : section ? (
          <RichText html={section.value} variant="book" />
        ) : <p className="py-6 text-sm text-gray-500 dark:text-night-400">暂无{currentTab.title}</p>}
      </section>
    </div>
  )
}
