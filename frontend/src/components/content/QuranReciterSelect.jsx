import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Mic } from 'lucide-react'
import styles from './ReaderDock.module.css'

// Select-only combobox (WAI-ARIA APG): focus stays on the trigger and the
// highlighted option is announced through aria-activedescendant.
// On phones the list spans the whole player.
export default function QuranReciterSelect({ reciters, value, chapter, onChange }) {
  const id = useId()
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selectedIndex = Math.max(0, reciters.findIndex(item => item.id === value))
  const selected = reciters[selectedIndex]
  // Recordings whose official timeline does not follow the audio for this chapter.
  const disabled = index => Boolean(reciters[index]?.unavailable_chapters?.includes(chapter))
  const enabled = reciters.map((_, index) => index).filter(index => !disabled(index))

  useEffect(() => {
    if (!open) return
    const close = event => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  if (!selected) return null
  const show = index => { setActive(index); setOpen(true) }
  const choose = index => {
    if (disabled(index)) return
    setOpen(false)
    if (reciters[index] && reciters[index].id !== value) onChange(reciters[index].id)
  }
  const step = direction => (direction > 0 ? enabled.find(index => index > active) : enabled.findLast(index => index < active)) ?? active
  const keyDown = event => {
    const last = reciters.length - 1
    const actions = {
      ArrowDown: () => open ? setActive(step(1)) : show(selectedIndex),
      ArrowUp: () => open ? setActive(step(-1)) : show(selectedIndex),
      Home: () => show(enabled[0] ?? 0),
      End: () => show(enabled.at(-1) ?? last),
      Enter: () => open ? choose(active) : show(selectedIndex),
      ' ': () => open ? choose(active) : show(selectedIndex),
      Escape: () => setOpen(false),
    }
    if (event.key === 'Tab') { setOpen(false); return }
    if (actions[event.key]) {
      if (event.key !== 'Escape' || open) event.preventDefault()
      actions[event.key]()
      return
    }
    if (event.key.length === 1 && /\S/.test(event.key)) {
      // Type-ahead: jump to the next reciter whose name starts with the typed letter.
      const start = open ? active : selectedIndex
      const order = reciters.map((_, offset) => (start + 1 + offset) % reciters.length)
      const match = order.find(index => !disabled(index) && (reciters[index].label || reciters[index].name).toLowerCase().startsWith(event.key.toLowerCase()))
      if (match !== undefined) show(match)
    }
  }

  return <div ref={rootRef} className={`${styles.reciter} min-w-0 flex-1`}>
    <button type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`}
      aria-activedescendant={open ? `${id}-option-${active}` : undefined} aria-label={`选择诵读者，当前：${selected.label || selected.name}`}
      title={selected.name} onClick={() => open ? setOpen(false) : show(selectedIndex)} onKeyDown={keyDown}
      className={`flex h-11 w-full items-center gap-2 rounded-full border bg-gray-50 px-3 text-left text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 dark:bg-night-900 dark:text-night-100 dark:focus-visible:ring-sage-400/40 ${open ? 'border-green-500 dark:border-sage-400' : 'border-gray-200 hover:border-green-300 dark:border-night-700 dark:hover:border-sage-600'}`}>
      <Mic className="h-4 w-4 shrink-0 text-green-700 dark:text-sage-400" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm">{selected.label || selected.name}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform motion-reduce:transition-none dark:text-night-400 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
    {open && <div className={`${styles.reciterOptions} absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-night-700 dark:bg-night-overlay`}>
      <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-medium text-gray-500 dark:border-night-700 dark:text-night-400">选择诵读者 · 共 {reciters.length} 位</p>
      <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label="诵读者" className="max-h-[min(20rem,55vh)] overflow-y-auto overscroll-contain p-1.5">
        {reciters.map((item, index) => {
          const isSelected = item.id === value
          const isDisabled = disabled(index)
          return <li key={item.id} id={`${id}-option-${index}`} data-index={index} role="option" aria-selected={isSelected} aria-disabled={isDisabled || undefined}
            onPointerDown={event => event.preventDefault()} onPointerMove={() => !isDisabled && index !== active && setActive(index)} onClick={() => choose(index)}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-1.5 text-sm ${isDisabled ? 'cursor-not-allowed text-gray-400 dark:text-night-500' : isSelected
              ? `cursor-pointer font-medium text-green-800 dark:text-sage-300 ${index === active ? 'bg-green-100 dark:bg-sage-900/50' : 'bg-green-50 dark:bg-sage-900/30'}`
              : `cursor-pointer text-gray-700 dark:text-night-200 ${index === active ? 'bg-gray-100 dark:bg-night-700' : ''}`}`}>
            <span className="min-w-0 flex-1" title={item.name}>
              <span className="block truncate">{item.label || item.name}</span>
              {isDisabled && <span className="block text-xs text-gray-400 dark:text-night-500">本章录音与官方时间轴不一致</span>}
            </span>
            {isSelected && <Check className="h-4 w-4 shrink-0 text-green-700 dark:text-sage-400" aria-hidden="true" />}
          </li>
        })}
      </ul>
    </div>}
  </div>
}
