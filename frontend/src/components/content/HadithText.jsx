import HighlightedText from '../common/HighlightedText'

export default function HadithText({ text, className = '', highlight = '' }) {
  const paragraphs = String(text ?? '').trim().split(/\n\s*\n/).filter(Boolean)
  return (
    <div className={`w-full min-w-0 break-words text-justify ${className}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line [&+p]:mt-4"><HighlightedText text={paragraph} query={highlight} /></p>
      ))}
    </div>
  )
}
