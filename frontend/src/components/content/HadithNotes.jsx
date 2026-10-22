import { StickyNote } from 'lucide-react';
import HadithText from './HadithText';

export default function HadithNotes({ notes, onDark = false, highlight = '' }) {
  if (!notes?.length) return null;
  return (
    <aside aria-label="圣训注释" className={`mt-5 border-t pt-4 ${onDark ? 'border-white/25 text-white/90' : 'border-gray-200 text-gray-600 dark:border-night-700 dark:text-night-300'}`}>
      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
        <StickyNote className="h-4 w-4" aria-hidden="true" />注释
      </p>
      <div className="space-y-3">
        {notes.map(note => (
          <div key={note.key}>
            <HadithText text={note.text} highlight={highlight} className="text-sm leading-7" />
            {note.status === 'unmatched' && note.pdf_page && <p className="mt-1 text-xs opacity-70">原 PDF 第 {note.pdf_page} 页</p>}
          </div>
        ))}
      </div>
    </aside>
  );
}
