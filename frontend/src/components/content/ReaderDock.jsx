import styles from './ReaderDock.module.css'

// Frameless bar pinned to the bottom of a reading column (Quran player, hadith reading bar).
// The page colour fades in behind the controls so text scrolling underneath stays out of the way.
export default function ReaderDock({ label, className = '', children }) {
  return <aside data-reader-dock="" aria-label={label} className={`${styles.dock} px-1 py-2 ${className}`}>
    <div aria-hidden="true" className="pointer-events-none absolute -inset-x-3 -bottom-4 -top-10 -z-10 bg-gradient-to-t from-gray-50 from-70% to-transparent dark:from-night-900 sm:from-60%" />
    {children}
  </aside>
}
