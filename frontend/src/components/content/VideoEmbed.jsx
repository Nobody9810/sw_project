import { useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'

// Local placeholder: no third-party request until the reader chooses to play.
export default function VideoEmbed({ video }) {
  const [playing, setPlaying] = useState(false)
  return <div className="my-5 text-left">
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-green-900 via-[#123524] to-[#0b1f16] shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      {playing
        ? <iframe src={video.src} title={`${video.label} 视频`} className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <button type="button" onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 transition group-hover:scale-105 group-hover:bg-white/25 motion-reduce:transition-none">
            <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium">播放 {video.label} 视频</span>
          <span className="text-xs text-white/70">点击后才会连接 {video.label}</span>
        </button>}
    </div>
    <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-night-400">
      部分地区可能无法播放。
      <a href={video.page} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 hover:underline dark:text-sage-400">
        在 {video.label} 打开<ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </p>
  </div>
}
