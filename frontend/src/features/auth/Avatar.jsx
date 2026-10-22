import { parsePreset } from './avatarPresets'

const lattice = [-60, -48, -36, -24, -12, 0, 12, 24, 36, 48, 60].map(x => `M${x} 0L${x + 64} 64M${x} 64L${x + 64} 0`).join('')
const ring = [[25, 25], [39, 25], [25, 39], [39, 39]]
const seed = [[41, 32], [36.5, 39.8], [27.5, 39.8], [23, 32], [27.5, 24.2], [36.5, 24.2]]
const square = '17,17 47,17 47,47 17,47'
const diamond = '32,10.8 53.2,32 32,53.2 10.8,32'

// Each pattern fills a 64×64 square; the round frame clips it.
const PATTERNS = {
  khatam: ({ bg, fg }) => <>
    <polygon points={square} fill={fg} /><polygon points={diamond} fill={fg} />
    <circle cx="32" cy="32" r="8" fill={bg} /><circle cx="32" cy="32" r="3.5" fill={fg} />
  </>,
  rosette: ({ fg, soft }) => <>
    <circle cx="32" cy="32" r="24" fill={soft} />
    <g fill="none" stroke={fg} strokeWidth="1.8"><circle cx="32" cy="32" r="9" />{seed.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="9" />)}<circle cx="32" cy="32" r="18" /></g>
  </>,
  zellij: ({ fg, soft }) => <>
    <circle cx="32" cy="32" r="25" fill={soft} />
    <g fill="none" stroke={fg} strokeWidth="2.2" strokeLinejoin="round"><polygon points={square} /><polygon points={diamond} /></g>
    <polygon points="24,24 40,24 40,40 24,40" fill={fg} /><polygon points="32,20.7 43.3,32 32,43.3 20.7,32" fill={fg} />
  </>,
  lattice: ({ bg, fg }) => <>
    <path d={lattice} stroke={fg} strokeWidth="2" opacity="0.85" />
    <circle cx="32" cy="32" r="11" fill={bg} stroke={fg} strokeWidth="2" /><polygon points="32,25 39,32 32,39 25,32" fill={fg} />
  </>,
  arch: ({ bg, fg }) => <>
    <path d="M16 56V30C16 19 24 12 32 7C40 12 48 19 48 30V56Z" fill={fg} />
    <path d="M22 56V31C22 23 27 18 32 14C37 18 42 23 42 31V56Z" fill={bg} />
    <path d="M32 18V27" stroke={fg} strokeWidth="1.5" /><circle cx="32" cy="30" r="3" fill={fg} /><rect x="10" y="54" width="44" height="4" fill={fg} />
  </>,
  rings: ({ fg }) => <>
    <g fill="none" stroke={fg} strokeWidth="2.2">{ring.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="13" />)}</g>
    <polygon points="32,27 37,32 32,37 27,32" fill={fg} />
  </>,
}

export function PresetArt({ presetKey }) {
  const preset = parsePreset(presetKey)
  if (!preset) return null
  const Draw = PATTERNS[preset.pattern]
  return <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true" focusable="false">
    <rect width="64" height="64" fill={preset.colors.bg} /><Draw {...preset.colors} />
  </svg>
}

// The reader's avatar: uploaded image, geometric preset, or the nickname's first character.
export default function Avatar({ avatar, name, className = 'h-10 w-10 text-base' }) {
  const frame = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`
  if (avatar?.type === 'image') return <span className={frame}><img src={avatar.url} alt="" className="h-full w-full object-cover" /></span>
  if (avatar?.type === 'preset' && parsePreset(avatar.key)) return <span className={frame}><PresetArt presetKey={avatar.key} /></span>
  return <span aria-hidden="true" className={`${frame} bg-green-50 font-semibold text-green-700 ring-1 ring-green-100 dark:bg-sage-900/40 dark:text-sage-300 dark:ring-sage-800`}>{Array.from(name || '读')[0]}</span>
}
