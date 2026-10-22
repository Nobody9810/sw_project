export function hadithChapterTarget(collection, chapter, hadith) {
  if (typeof collection !== 'string' && typeof collection !== 'number') return null
  const value = String(collection)
  if (!/^[1-9]\d{0,14}$/.test(value) || !Number.isSafeInteger(Number(value))) return null
  if (typeof chapter !== 'string' || !chapter.trim() || chapter.length > 512) return null
  if (hadith !== undefined) {
    if (typeof hadith !== 'string' && typeof hadith !== 'number') return null
    const id = String(hadith)
    if (!/^[1-9]\d{0,14}$/.test(id) || !Number.isSafeInteger(Number(id))) return null
    return { collection: Number(value), chapter, hadith: Number(id) }
  }
  return { collection: Number(value), chapter }
}

export function hadithChapterPath(data) {
  const target = hadithChapterTarget(data?.collection, data?.chapter, data?.id)
  if (!target) return null
  const params = new URLSearchParams({ collection: String(target.collection), chapter: target.chapter })
  if (target.hadith) params.set('hadith', String(target.hadith))
  return `/经训?${params}`
}
