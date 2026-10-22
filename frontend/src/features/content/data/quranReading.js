// Every audio URL comes from our validated Quran Foundation response, never a CDN template.
export function quranAudioUrl(verse, reciter, track, chapter = track?.chapter) {
  if (!verse || !reciter || track?.chapter !== chapter || track?.reciter !== reciter.id ||
      !/^https:\/\//.test(track?.url || '') || !track?.timings?.some(row => row.verse === verse.verse)) return '';
  return track.url;
}

export function validateQuranChapter(data, chapter, script = 'qpc-hafs') {
  if (data?.chapter !== chapter || data.text_script !== script ||
      !Array.isArray(data.verses) || !data.verses.length || data.verses.some((row, index) =>
        row?.verse !== index + 1 || row.chapter !== chapter || typeof row.text !== 'string' || !row.text.trim() ||
        (data.translation_status === 'unavailable' ? row.translation !== null : typeof row.translation !== 'string' || !row.translation.trim()) || !Array.isArray(row.words) || !row.words.length)) {
    throw new Error('经文与译文数据不完整，请重新加载');
  }
  return data;
}
