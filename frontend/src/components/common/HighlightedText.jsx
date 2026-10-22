export default function HighlightedText({ text, query = '' }) {
  const value = String(text ?? '')
  // Match the installed API SearchFilter: whitespace/comma-delimited terms.
  const terms = Array.from(new Set(String(query).replace(/\0/g, '').split(/[,\s]+/u).filter(Boolean)))
    .sort((a, b) => b.length - a.length)
  if (!terms.length) return value
  const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = value.split(new RegExp(`(${escaped.join('|')})`, 'giu'))
  return parts.map((part, index) => index % 2
    ? <mark key={index} className="rounded bg-green-100 px-0.5 text-green-900 dark:bg-sage-900/60 dark:text-sage-200">{part}</mark>
    : part)
}
