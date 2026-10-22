import useQuranAudio from '@/hooks/useQuranAudio'
import useQuranReaderData from '@/hooks/useQuranReaderData'
import QuranReader from './QuranReader'
import useQuranFont from '@/hooks/useQuranFont'
import { qpcHafs, indoPak, quranFontFamily } from '@/lib/quranFonts'

// Audio clock updates stay local; the directory and the rest of HadithDetailPage do not rerender.
export default function QuranExperience(props) {
  // Each script is checked against its own official font.
  const fontStatus = useQuranFont(quranFontFamily(props.arab.text_script))
  const readerAudio = useQuranReaderData('audio', props.arab.chapter, props.reciter?.id, Boolean(props.reciter?.id))
  const playback = useQuranAudio({ chapter: props.arab.chapter, enabled: true,
    reciter: props.reciter, track: readerAudio.data, verses: props.arab.verses, continuous: props.playbackMode === 'all' })
  const player = { ...playback, mode: props.playbackMode, toggleMode: () => props.onPlaybackModeChange?.(props.playbackMode === 'all' ? 'single' : 'all') }
  return <div className={`${qpcHafs.variable} ${indoPak.variable}`}><QuranReader {...props} readerAudio={readerAudio} playback={player} fontStatus={fontStatus} /></div>
}
