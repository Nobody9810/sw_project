// Geometric avatar presets, drawn locally (no external avatar service).
// Keys must match backend/users/avatars.py; tests/avatar-presets.test.js checks both lists.
export const AVATAR_PATTERNS = [
  ['khatam', '八角星'], ['rosette', '花环'], ['zellij', '星纹'],
  ['lattice', '窗格'], ['arch', '拱门'], ['rings', '连环'],
]
export const AVATAR_COLORS = {
  green: { label: '深绿', bg: '#14532d', fg: '#e3c26f', soft: '#1d6b3f' },
  sand: { label: '沙色', bg: '#f3e7cf', fg: '#8a5a19', soft: '#e7d4ae' },
  indigo: { label: '靛蓝', bg: '#1e3a5f', fg: '#e9dcb4', soft: '#2b4c77' },
}
export const AVATAR_PRESETS = Object.keys(AVATAR_COLORS).flatMap(color =>
  AVATAR_PATTERNS.map(([pattern, label]) => ({ key: `${pattern}-${color}`, pattern, color, label: `${label} · ${AVATAR_COLORS[color].label}` })))

export function parsePreset(key) {
  const preset = AVATAR_PRESETS.find(item => item.key === key)
  return preset ? { ...preset, colors: AVATAR_COLORS[preset.color] } : null
}
