import { useEffect, useId, useRef, useState } from 'react'

const STAR = '7,7 17,7 17,17 7,17'
const STAR_TURNED = '12,4.9 19.1,12 12,19.1 4.9,12'

function Tile({ id, color }) {
  return <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
    <g fill="none" stroke={color} strokeWidth="0.9"><polygon points={STAR} /><polygon points={STAR_TURNED} /><path d="M0 0L4.9 4.9M24 0L19.1 4.9M0 24L4.9 19.1M24 24L19.1 19.1" /></g>
  </pattern>
}

function Emblem({ className }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><polygon points={STAR} /><polygon points={STAR_TURNED} /></g>
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
}

// Shown when there is no cover or it fails to load: drawn locally, follows the site theme.
// `book` reads as a cover (title in a gold frame); `article` is a quiet pattern with the section name.
export function CoverPlaceholder({ kind = 'article', label = '書味', title = '', className = '' }) {
  const id = useId().replace(/:/g, '')
  if (kind === 'book') return <div role="img" aria-label={title ? `${title}（暂无封面）` : '暂无封面'}
    className={`relative overflow-hidden bg-[#14412b] text-[#ecd9a6] [container-type:inline-size] dark:bg-[#10301f] ${className}`}>
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false"><defs><Tile id={id} color="rgb(236 217 166 / 0.12)" /></defs><rect width="100%" height="100%" fill={`url(#${id})`} /></svg>
    <div className="absolute inset-[7%] flex flex-col items-center justify-between border border-[#ecd9a6]/45 px-[8%] py-[10%] text-center">
      <Emblem className="h-[14%] max-h-8 min-h-4 w-auto opacity-90" />
      <p className="line-clamp-4 font-serif text-[clamp(0.7rem,9cqw,1.15rem)] font-semibold leading-snug">{title}</p>
      <span className="text-[clamp(9px,6cqw,12px)] tracking-[0.3em] opacity-70">{label}</span>
    </div>
  </div>
  return <div role="img" aria-label="暂无图片"
    className={`relative flex items-center justify-center overflow-hidden bg-[#eef5f0] text-green-700/70 dark:bg-night-900 dark:text-sage-400/60 ${className}`}>
    <svg className="absolute inset-0 h-full w-full text-green-700/[0.14] dark:text-sage-300/[0.10]" aria-hidden="true" focusable="false"><defs><Tile id={id} color="currentColor" /></defs><rect width="100%" height="100%" fill={`url(#${id})`} /></svg>
    <div className="relative flex flex-col items-center gap-1.5">
      <Emblem className="h-7 w-7" />
      <span className="text-xs font-medium tracking-[0.25em]">{label}</span>
    </div>
  </div>
}

// An <img> that falls back to CoverPlaceholder when there is no source or it fails,
// including failures that happen before hydration attaches onError.
export default function CoverImage({ src, alt, kind, label, title, className = '', placeholderClassName = className, ...props }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(null)
  useEffect(() => {
    const image = ref.current
    if (image?.complete && image.naturalWidth === 0) setFailed(src)
  }, [src])
  if (!src || failed === src) return <CoverPlaceholder kind={kind} label={label} title={title || alt} className={placeholderClassName} />
  return <img ref={ref} src={src} alt={alt} className={className} onError={() => setFailed(src)} {...props} />
}
