import { useRef } from 'react'
import { ImageUp, RotateCcw, X } from 'lucide-react'
import { AVATAR_PRESETS } from './avatarPresets'
import { PresetArt } from './Avatar'

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const action = 'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50'

// Inline chooser under the account header: geometric presets, an upload, or back to the initial.
export default function AvatarPicker({ avatar, busy, status, onPreset, onUpload, onRemove, onClose }) {
  const input = useRef(null)
  const chosen = avatar?.type === 'preset' ? avatar.key : null
  return <section id="avatar-picker" aria-labelledby="avatar-picker-title" className="mt-5 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-night-700 dark:bg-night-900/50">
    <div className="flex items-center justify-between">
      <h2 id="avatar-picker-title" className="text-sm font-medium text-gray-900 dark:text-night-100">选择头像</h2>
      <button type="button" onClick={onClose} aria-label="收起头像选择" className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-night-400 dark:hover:bg-night-700 dark:hover:text-night-200"><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>
    <div role="group" aria-label="几何图案" className="mt-3 grid grid-cols-6 gap-2" aria-busy={busy}>
      {AVATAR_PRESETS.map(preset => {
        const selected = preset.key === chosen
        return <button key={preset.key} type="button" disabled={busy} aria-pressed={selected} aria-label={preset.label} title={preset.label}
          onClick={() => !selected && onPreset(preset.key)}
          className={`aspect-square overflow-hidden rounded-full ring-offset-2 ring-offset-gray-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 enabled:hover:scale-105 disabled:cursor-wait motion-reduce:transition-none dark:ring-offset-night-900 ${selected ? 'ring-2 ring-green-600 dark:ring-sage-400' : ''}`}>
          <PresetArt presetKey={preset.key} />
        </button>
      })}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file) }} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={`${action} border border-gray-200 bg-white text-gray-700 enabled:hover:border-green-300 enabled:hover:text-green-700 dark:border-night-700 dark:bg-night-800 dark:text-night-200 dark:enabled:hover:text-sage-300`}>
        <ImageUp className="h-4 w-4" aria-hidden="true" />{busy ? '正在处理…' : '上传图片'}
      </button>
      {avatar && <button type="button" disabled={busy} onClick={onRemove} className={`${action} text-gray-500 enabled:hover:text-green-700 dark:text-night-400 dark:enabled:hover:text-sage-300`}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />恢复为昵称首字
      </button>}
    </div>
    <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-night-400">支持 JPG、PNG、WEBP、GIF，最大 2 MB。服务器会裁成正方形，并去掉拍摄地点等图片信息。头像会公开显示在你的评论旁。</p>
    <p role="status" className={`mt-1 min-h-5 text-xs ${status.error ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-sage-400'}`}>{status.text}</p>
  </section>
}
