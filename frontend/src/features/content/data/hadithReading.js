const chapterLabel = chapter => chapter ? chapter.display_name || chapter.name : null

// Reading order inside a collection: the next page of this chapter, then the next chapter.
// Returns plain descriptors; the page decides what each step does.
export function hadithReadingSteps({ chapters, chapterIndex, page, totalPages }) {
  const previousChapter = { kind: 'chapter', offset: -1, edge: '已是第一篇', target: chapterLabel(chapters[chapterIndex - 1]) }
  const nextChapter = { kind: 'chapter', offset: 1, edge: '已是最后一篇', target: chapterLabel(chapters[chapterIndex + 1]) }
  return {
    title: chapterLabel(chapters[chapterIndex]),
    previous: page > 1
      ? { kind: 'page', page: page - 1, label: '上一页', edge: '已是第一页', target: `第 ${page - 1} 页` }
      : { ...previousChapter, label: '上一篇' },
    next: page < totalPages
      ? { kind: 'page', page: page + 1, label: '下一页', edge: '已是最后一页', target: `第 ${page + 1} 页` }
      : { ...nextChapter, label: '下一篇' },
    skip: { previous: previousChapter, next: nextChapter },
  }
}
