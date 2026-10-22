import { Loader2 } from 'lucide-react'
import styles from './LoadingMotion.module.css'
import SkeletonContent from './SkeletonContent'

// Keep loading feedback inside the region being replaced, with stable space.
export default function LoadingState({ kind = 'content', label = '正在加载内容…', count, onDark = false, className = '', animate = true }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {kind === 'inline' || kind === 'refresh' ? <div className={`${styles.visual} flex ${kind === 'refresh' ? 'min-h-10' : 'min-h-32'} items-center justify-center gap-2 text-sm ${onDark ? 'text-white' : 'text-gray-500 dark:text-night-400'}`}>
        <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" /><span aria-hidden="true">{label}</span>
      </div> : <div className={styles.visual}><div aria-hidden="true" className={animate ? 'motion-safe:animate-pulse' : ''}>
        <SkeletonContent kind={kind} count={count} onDark={onDark} />
      </div></div>}
    </div>
  )
}
