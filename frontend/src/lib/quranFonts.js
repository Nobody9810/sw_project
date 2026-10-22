import localFont from 'next/font/local'

// Keep official encodings paired with the exact original font versions.
export const qpcHafs = localFont({
  src: '../assets/fonts/UthmanicHafs1Ver18.woff2',
  variable: '--font-qpc-hafs',
  weight: '400', style: 'normal', display: 'swap', preload: false,
  adjustFontFallback: false,
})

export const indoPak = localFont({
  src: '../assets/fonts/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2',
  variable: '--font-indopak',
  weight: '400', style: 'normal', display: 'swap', preload: false,
  adjustFontFallback: false,
})

export function quranFontFamily(script) {
  return (script === 'indopak' ? indoPak : qpcHafs).style.fontFamily.split(',')[0].replace(/['"]/g, '').trim()
}
