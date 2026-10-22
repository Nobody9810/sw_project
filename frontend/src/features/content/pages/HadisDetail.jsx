import Head from 'next/head'
import { useReportReadingToolsScope } from '@/components/common/ReadingToolsContext'
import { useRouter } from 'next/router'
import useMobileDrawer from '@/hooks/useMobileDrawer'
import QuranExperience from '@/components/content/QuranExperience'
import HadithReaderBar from '@/components/content/HadithReaderBar'
import ReaderDock from '@/components/content/ReaderDock'
import DirectoryButton from '@/components/content/DirectoryButton'
import useQuranReaderData from '@/hooks/useQuranReaderData'
import directoryStyles from './HadisDetail.module.css'
import { hadithDirectory } from '@/lib/contentSidebar'
import useDailyHadith from '@/hooks/useDailyHadith'
import useHadithChapterRoute from '@/hooks/useHadithChapterRoute'
import useHadithTargetScroll from '@/hooks/useHadithTargetScroll'
import useBeforePaintEffect from '@/hooks/useBeforePaintEffect'
import { usePageReady } from '@/components/common/PageLoadContext'
import { useState, useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import RequestError from '@/components/common/RequestError';
import HighlightedText from '@/components/common/HighlightedText';
import { requestErrorMessage } from '@/lib/requestError';
import apiClient from "@/lib/apiClient";
import HadithText from '@/components/content/HadithText';
import HadithNotes from '@/components/content/HadithNotes';
import HadithOriginalNumber from '@/components/content/HadithOriginalNumber';
import HadithCollectionIntro from '@/components/content/HadithCollectionIntro';
import DailyHadithCard from '@/components/content/Sidebar/DailyHadithCard';
import LoadingState from '@/components/common/LoadingState';
import quranChapters from '../data/quranChapters';
import { validateQuranChapter } from '../data/quranReading';
import { hadithReadingSteps } from '../data/hadithReading';
import { Search, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Hash, X, Book, ArrowUp } from "lucide-react";

// Per-viewer reading preferences; the page works the same when storage is unavailable.
const readPreference = key => { try { return localStorage.getItem(key) } catch { return null } };
const writePreference = (key, value) => {
  try { if (value === null || value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, String(value)) } catch { /* not persisted */ }
};
const DEFAULT_QURAN_SCRIPT = 'qpc-hafs';

function HadithDetailPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [selection, setSelection] = useState(null);
  const [targetHadithId, setTargetHadithId] = useState(null);
  const targetRequestRef = useRef(null);
  const resolvedPageRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const quranController = useRef(null);
  const searchTopRef = useRef(null);
  const quranTopRef = useRef(null);
  const [quranScrollRequest, setQuranScrollRequest] = useState(0);
  const overviewTopRef = useRef(null);
  const [collectionDetail, setCollectionDetail] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState('');
  const [collectionRequest, setCollectionRequest] = useState(0);
  const sidebarRef = useRef(null);
  const directoryListRef = useRef(null);
  const sidebarTriggerRef = useRef(null);
  const sidebarCloseRef = useRef(null);
  // Desktop collapse reuses the content-sidebar preference; the card folds into a spine with a tab.
  const directoryCollapsed = useSyncExternalStore(hadithDirectory.subscribe, hadithDirectory.getCollapsed, hadithDirectory.getServerSnapshot);
  const toggleDirectory = () => hadithDirectory.setCollapsed(!directoryCollapsed);
  const [isMobileDirectory, setIsMobileDirectory] = useState(false);
  useEffect(() => {
    const update = () => setIsMobileDirectory(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const [overviewScrollRequest, setOverviewScrollRequest] = useState(0);
  const [query, setQuery] = useState("");
  const [hadiths, setHadiths] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 侧边栏相关状态
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState('');
  const [collectionsAttempt, setCollectionsAttempt] = useState(0);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [openCollections, setOpenCollections] = useState(new Set());
  const [viewMode, setViewMode] = useState("daily"); // 'daily', 'collection', 'search', 'chapter'
  const [quranPlaybackMode, setQuranPlaybackMode] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端侧边栏开关
  
  // The bottom entries open the drawer; focus returns to the one that was used (without scrolling).
  const openDirectory = event => {
    if (event?.currentTarget) sidebarTriggerRef.current = event.currentTarget;
    setSidebarOpen(true);
  };
  useEffect(() => {
    // Open the phone sheet at the chapter being read rather than at the top of a long list.
    if (!sidebarOpen) return;
    const list = directoryListRef.current;
    const current = list?.querySelector('[aria-current="page"]');
    if (list && current) list.scrollTop += current.getBoundingClientRect().top - list.getBoundingClientRect().top - (list.clientHeight - current.clientHeight) / 2;
  }, [sidebarOpen]);
  useMobileDrawer({ open: sidebarOpen, onClose: () => setSidebarOpen(false), panelRef: sidebarRef, triggerRef: sidebarTriggerRef, initialFocusRef: sidebarCloseRef, desktopWidth: 768 });

  // 古兰经相关状态
  const [contentType, setContentType] = useState("hadith"); // 'hadith' 或 'quran'
  const [quranChapter, setQuranChapter] = useState(1);
  useReportReadingToolsScope(contentType === 'quran' ? `quran:${quranChapter}` : ['collection', 'chapter'].includes(viewMode) ? `hadith:${activeCollectionId}:${selection?.chapter || 'intro'}` : null);
  const [quranData, setQuranData] = useState(null);
  const [quranLoading, setQuranLoading] = useState(false);
  const [quranError, setQuranError] = useState(null);
  const [reciterId, setReciterId] = useState('');
  const [quranScript, setQuranScript] = useState(() => (typeof window === 'undefined' ? null : readPreference('quran-script')) || DEFAULT_QURAN_SCRIPT);
  const [quranTranslation, setQuranTranslation] = useState(() => {
    const stored = typeof window === 'undefined' ? null : readPreference('quran-translation');
    return stored && /^\d{1,9}$/.test(stored) ? Number(stored) : null;
  });
  const readingOptions = useQuranReaderData('reading-options', 1, undefined, contentType === 'quran');
  const keepVerseRef = useRef(null);
  const reciterData = useQuranReaderData('reciters', 1, undefined, contentType === 'quran');
  const chapterCatalog = useQuranReaderData('chapters', 1, undefined, contentType === 'quran');
  const reciters = reciterData.data?.reciters || [];
  // Keep the reader's choice, but never play a recording whose timeline was verified not to match.
  const playable = item => !item.unavailable_chapters?.includes(quranChapter);
  const reciter = reciters.find(item => item.id === reciterId && playable(item)) || reciters.find(playable) || reciters[0];
  

  const daily = useDailyHadith();

  const API_BASE = "hadith/hadiths/";
  const activeCollection = collectionDetail?.id === activeCollectionId ? collectionDetail : collections.find(collection => collection.id === activeCollectionId);

  useEffect(() => {
    if (contentType !== 'hadith' || viewMode !== 'collection' || activeCollectionId === null) return;
    let active = true;
    const controller = new AbortController();
    setCollectionLoading(true);
    setCollectionError('');
    setCollectionDetail(null);
    const load = async () => {
      try {
        const response = await apiClient.get(`hadith/collections/${activeCollectionId}/`, { signal: controller.signal });
        if (response.data?.id !== activeCollectionId) throw new Error('圣训集介绍数据不匹配');
        if (active) {
          setCollectionDetail(response.data);
          setCollections(previous => previous.map(item => item.id === activeCollectionId ? response.data : item));
        }
      } catch (error) {
        if (active && error.code !== 'ERR_CANCELED') setCollectionError(error.isAxiosError ? requestErrorMessage(error) : error.message);
      } finally {
        if (active) setCollectionLoading(false);
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [contentType, activeCollectionId, viewMode, collectionRequest]);

  useEffect(() => {
    if (contentType === 'hadith' && viewMode === 'collection') {
      searchTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [contentType, viewMode, collectionRequest, collectionLoading]);

  // 获取所有圣训集
  useEffect(() => {
    const controller = new AbortController();
    setCollectionsLoading(true);
    setCollectionsError('');
    const fetchCollections = async () => {
      try {
        const res = await apiClient.get("hadith/collections/", { signal: controller.signal });
        if (!controller.signal.aborted) setCollections(res.data.results || res.data || []);
      } catch (error) {
        if (!controller.signal.aborted) setCollectionsError(requestErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setCollectionsLoading(false);
      }
    };
    void fetchCollections();
    return () => controller.abort();
  }, [collectionsAttempt]);

  useEffect(() => {
    if (!selection) return;
    const requestKey = JSON.stringify([selection, page, retryAttempt]);
    const resolved = resolvedPageRef.current;
    resolvedPageRef.current = null;
    if (resolved === requestKey) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    const load = async () => {
      try {
        const target = targetRequestRef.current;
        const response = await apiClient.get(API_BASE, { params: { ...selection, page, page_size: 30, ...(target ? { target } : {}) }, signal: controller.signal });
        if (active) {
          setHadiths(response.data.results || []); setCount(response.data.count || 0);
          targetRequestRef.current = null;
          const actualPage = response.data.page;
          if (target && Number.isInteger(actualPage) && actualPage > 0 && actualPage !== page) {
            resolvedPageRef.current = JSON.stringify([selection, actualPage, retryAttempt]);
            setPage(actualPage);
          }
        }
      } catch (error) {
        if (active && error.code !== 'ERR_CANCELED') setLoadError(requestErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [selection, page, retryAttempt]);

  useBeforePaintEffect(() => {
    if (viewMode === 'chapter' && selection?.chapter && !targetHadithId) {
      searchTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [selection, viewMode, targetHadithId]);

  useEffect(() => {
    if (overviewScrollRequest > 0) {
      directoryListRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      (overviewTopRef.current || searchTopRef.current)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [overviewScrollRequest]);

  const search = () => {
    if (!query.trim()) return;
    targetRequestRef.current = null;
    setTargetHadithId(null);
    setViewMode('search');
    setPage(1);
    setLoading(true);
    setSelection({ search: query.trim(), ...(activeCollectionId !== null ? { collection: activeCollectionId } : {}) });
  };

  const showAllCollections = useCallback(() => {
    if (router.isReady && (router.query.collection !== undefined || router.query.chapter !== undefined || router.query.hadith !== undefined)) {
      void router.replace('/经训', undefined, { shallow: true, scroll: false });
    }
    quranController.current?.abort();
    targetRequestRef.current = null;
    setTargetHadithId(null);
    setQuranLoading(false);
    setContentType('hadith');
    setActiveCollectionId(null);
    setOpenCollections(new Set());
    setPage(1);
    setLoadError('');
    setQuery('');
    setViewMode('daily');
    setSelection(null);
    setHadiths([]);
    setCount(0);
    setLoading(false);
    setSidebarOpen(false);
    setOverviewScrollRequest(value => value + 1);
  }, [router]);

  // 切换圣训集展开
  const toggleCollection = (id) => {
    targetRequestRef.current = null;
    setTargetHadithId(null);
    const newOpen = new Set(openCollections);
    if (newOpen.has(id)) newOpen.delete(id);
    else newOpen.add(id);
    setOpenCollections(newOpen);
    setActiveCollectionId(id);
    setViewMode('collection');
    setPage(1);
    setQuery('');
    setLoading(false);
    setLoadError('');
    setSelection(null);
    setHadiths([]);
    setCount(0);
    setCollectionLoading(true);
    setCollectionRequest(value => value + 1);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // 加载章节圣训
  const loadChapterHadiths = useCallback((collectionId, chapterName, target = null) => {
    targetRequestRef.current = target;
    resolvedPageRef.current = null;
    setTargetHadithId(target);
    quranController.current?.abort();
    setQuranLoading(false);
    setContentType('hadith');
    setActiveCollectionId(collectionId);
    setOpenCollections(current => new Set(current).add(collectionId));
    setViewMode('chapter');
    setQuery('');
    setLoadError('');
    setPage(1);
    setLoading(true);
    setSelection({ collection: collectionId, chapter: chapterName });
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const chapterRoutePending = useHadithChapterRoute(loadChapterHadiths, showAllCollections);
  usePageReady(chapterRoutePending || collectionsLoading || (viewMode === 'daily' ? daily.status === 'loading' : viewMode === 'chapter' && loading));
  const highlightedHadithId = useHadithTargetScroll(targetHadithId, hadiths, loading);
  const searchHighlight = viewMode === 'search' ? selection?.search || '' : '';

  useEffect(() => () => quranController.current?.abort(), []);

  useEffect(() => {
    if (contentType === 'quran' && quranScrollRequest > 0 && !keepVerseRef.current) {
      quranTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [contentType, quranScrollRequest, quranLoading]);

  useEffect(() => {
    // After switching script or translation, return to the verse that was being read.
    if (quranLoading || !quranData || !keepVerseRef.current) return;
    document.querySelector(`[data-verse="${keepVerseRef.current}"]`)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    keepVerseRef.current = null;
  }, [quranData, quranLoading]);

  const changeReading = (next, chapter = quranChapter, keepVerse = undefined) => {
    const script = next.script ?? quranScript;
    const translation = next.translation !== undefined ? next.translation : quranTranslation;
    setQuranScript(script); setQuranTranslation(translation);
    writePreference('quran-script', script === DEFAULT_QURAN_SCRIPT ? null : script);
    writePreference('quran-translation', translation);
    const visible = keepVerse !== undefined ? keepVerse
      : Array.from(document.querySelectorAll('[data-verse]')).find(row => row.getBoundingClientRect().bottom > 120)?.getAttribute('data-verse') || null;
    void loadQuranChapter(chapter, { script, translation, keepVerse: visible });
  };

  const openQuran = () => {
    setContentType("quran");
    if (!quranData || quranData.chapter !== quranChapter) {
      void loadQuranChapter(quranChapter);
    } else {
      setSidebarOpen(false);
      setQuranScrollRequest(value => value + 1);
    }
  };

  // 使用与其他板块相同的 API 客户端，快速切章时取消旧请求。
  const loadQuranChapter = async (chapter, { script = quranScript, translation = quranTranslation, keepVerse = null, fallbackFrom = null } = {}) => {
    quranController.current?.abort();
    const controller = new AbortController();
    quranController.current = controller;
    keepVerseRef.current = keepVerse;
    setQuranLoading(true);
    setQuranError(null);
    setQuranData(null);
    setQuranChapter(chapter);
    if (!keepVerse) setQuranScrollRequest(value => value + 1);
    if (window.innerWidth < 768) setSidebarOpen(false);
    try {
      const params = { ...(script !== DEFAULT_QURAN_SCRIPT ? { script } : {}), ...(translation ? { translation } : {}) };
      const response = await apiClient.get(`hadith/quran-reader/chapter/${chapter}/`, { signal: controller.signal, timeout: 60000, params });
      const data = validateQuranChapter(response.data, chapter, script);
      if (!controller.signal.aborted) setQuranData(fallbackFrom ? { ...data, script_fallback: fallbackFrom } : data);
    } catch (error) {
      if (controller.signal.aborted) return;
      const code = error.response?.data?.code;
      if (code === 'word_text_mismatch' && script !== DEFAULT_QURAN_SCRIPT) {
        // The official words and verse text disagree for this chapter in the chosen script:
        // read this chapter in the default script and keep the saved preference for the others.
        void loadQuranChapter(chapter, { script: DEFAULT_QURAN_SCRIPT, translation, keepVerse, fallbackFrom: script });
        return;
      }
      if ((code === 'script_unsupported' || code === 'translation_unsupported') && (script !== DEFAULT_QURAN_SCRIPT || translation)) {
        // A saved choice the official source no longer offers: fall back to the defaults once.
        changeReading({ script: DEFAULT_QURAN_SCRIPT, translation: null }, chapter, keepVerse);
        return;
      }
      setQuranError(error.response?.data?.error || (error.isAxiosError ? requestErrorMessage(error) : error.message));
      setQuranLoading(false);
      controller.abort();
    } finally {
      if (!controller.signal.aborted) setQuranLoading(false);
    }
  };

  const totalPages = Math.ceil(count / 30);
  const goToPage = nextPage => {
    setLoading(true); setPage(nextPage);
    searchTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  // Bottom reading bar (replaces the old pager): reading order is the next page, then the next chapter.
  const chapterList = viewMode === 'chapter' ? activeCollection?.chapters || [] : [];
  const chapterIndex = chapterList.findIndex(chapter => chapter.name === selection?.chapter);
  const runStep = step => step && { ...step, onClick: () => step.kind === 'page'
    ? goToPage(step.page) : loadChapterHadiths(activeCollectionId, chapterList[chapterIndex + step.offset].name) };
  const steps = chapterIndex >= 0 ? hadithReadingSteps({ chapters: chapterList, chapterIndex, page, totalPages }) : null;
  const readerBar = steps ? {
    title: steps.title,
    subtitle: `${activeCollection.name} · 第 ${chapterIndex + 1} / ${chapterList.length} 篇${totalPages > 1 ? ` · 第 ${page} / ${totalPages} 页` : ''}`,
    previous: runStep(steps.previous),
    next: runStep(steps.next),
    skip: { previous: runStep(steps.skip.previous), next: runStep(steps.skip.next) },
  } : viewMode === 'search' ? {
    title: `搜索：${selection?.search}`,
    subtitle: `${activeCollection?.name || '全部圣训集'} · 共 ${count} 条 · 第 ${page} / ${Math.max(1, totalPages)} 页`,
    previous: { label: '上一页', edge: '已是第一页', target: page > 1 ? `第 ${page - 1} 页` : null, onClick: () => goToPage(page - 1) },
    next: { label: '下一页', edge: '已是最后一页', target: page < totalPages ? `第 ${page + 1} 页` : null, onClick: () => goToPage(page + 1) },
  } : null;

  // Phones always keep a directory entry at the bottom: inside the reading bar or player when shown, otherwise here.
  const readingBarShown = contentType === 'hadith' && viewMode !== 'collection' && !loadError && !loading && hadiths.length > 0 && Boolean(readerBar);
  const playerShown = contentType === 'quran' && !quranLoading && !quranError && Boolean(quranData);

  return (
    <div className="bg-gray-50 dark:bg-night-900 transition-colors min-h-screen">
      {contentType === 'quran' && <Head><meta name="google" content="notranslate" key="quran-notranslate" /></Head>}
      {/* 移动端遮罩层：随目录淡入淡出 */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none md:hidden ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className={`flex gap-6 max-w-7xl mx-auto px-4 py-6 ${directoryStyles.layout}`}>
        {/* 圣训与古兰经共用：桌面目录吸顶并占满可视高度，列表在目录内独立滚动；移动端使用抽屉。 */}
        <div
          ref={sidebarRef}
          id="hadith-directory"
          inert={isMobileDirectory && !sidebarOpen}
          role={isMobileDirectory && sidebarOpen ? 'dialog' : undefined}
          aria-modal={isMobileDirectory && sidebarOpen ? true : undefined}
          aria-label="经训目录"
          tabIndex={-1}
          className={`${directoryStyles.panel} fixed inset-x-0 bottom-0 z-50 h-[85dvh] w-full overflow-hidden rounded-t-xl border-t border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none dark:border-night-700 dark:bg-night-800 md:sticky md:inset-auto md:top-20 md:z-auto md:h-[calc(100dvh-6rem)] md:w-80 md:shrink-0 md:self-start md:rounded-xl md:border md:shadow-sm ${
            sidebarOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
          }`}
        >
          {/* Desktop spine inside the card's right edge: the same control folds and reopens it. */}
          <button type="button" onClick={toggleDirectory} aria-controls="hadith-directory" aria-expanded={!directoryCollapsed}
            aria-label={directoryCollapsed ? '展开经训目录' : '收起经训目录'} title={directoryCollapsed ? '展开经训目录' : '收起经训目录'}
            className={`${directoryStyles.spine} group hidden items-center justify-center border-l border-gray-100 bg-gray-50/70 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500 dark:border-night-700 dark:bg-night-900/40 dark:text-night-500 dark:hover:bg-night-700 dark:hover:text-sage-400 md:flex`}>
            <span className="flex h-12 w-full items-center justify-center rounded-l-md transition-colors group-hover:bg-green-100/60 dark:group-hover:bg-night-600/60">
              {directoryCollapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
            </span>
          </button>
          <div className={directoryStyles.directory} inert={!isMobileDirectory && directoryCollapsed} aria-hidden={!isMobileDirectory && directoryCollapsed ? true : undefined}>
          <div className="shrink-0 border-b border-gray-200 bg-white px-4 pb-3 pt-2 dark:border-night-700 dark:bg-night-800 md:rounded-t-xl md:p-6">
            {/* Phone bottom sheet: grab bar, then title and close on one row. */}
            <div className="md:hidden">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-night-600" aria-hidden="true" />
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-night-100">经训目录</h2>
                <button
                  ref={sidebarCloseRef}
                  type="button"
                  aria-label="关闭经训目录"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:bg-night-700 dark:text-night-200 dark:active:bg-night-600"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            
            {/* 内容类型切换 */}
            <div className="flex gap-2 bg-gray-100 dark:bg-night-700 p-1 rounded-lg">
              <button
                onClick={showAllCollections}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                  contentType === "hadith"
                    ? "bg-white dark:bg-night-600 text-green-700 dark:text-sage-400 shadow-sm"
                    : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-100"
                }`}
              >
                <BookOpen className="w-4 h-4 inline mr-1" />
                圣训
              </button>
              <button
                onClick={openQuran}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                  contentType === "quran"
                    ? "bg-white dark:bg-night-600 text-green-700 dark:text-sage-400 shadow-sm"
                    : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-100"
                }`}
              >
                <Book className="w-4 h-4 inline mr-1" />
                古兰经
              </button>
            </div>
          </div>

          <div ref={directoryListRef} tabIndex={0} aria-label={contentType === 'quran' ? '古兰经章节目录' : '圣训集目录'} className="p-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-4 space-y-2 md:space-y-3 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500">
            {contentType === "quran" ? (
              // 古兰经章节列表
              <div className="space-y-1">
                <div className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-night-400 uppercase tracking-wide">
                  古兰经章节（{chapterCatalog.data?.available_count ?? '—'} 章）
                </div>
                {chapterCatalog.data?.complete === false && <p className="px-2 pb-2 text-xs leading-5 text-gray-500 dark:text-night-400">预发布接口目前提供 {chapterCatalog.data.available_count} / 114 章，仅显示可用章节。</p>}
                <div className="space-y-1">
                  {chapterCatalog.status === 'loading' && <LoadingState label="正在加载古兰经目录…" count={3} />}
                  {chapterCatalog.status === 'error' && <RequestError message={chapterCatalog.error} onRetry={chapterCatalog.retry} />}
                  {(chapterCatalog.data?.chapters || []).map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => loadQuranChapter(ch.id)}
                      aria-current={quranChapter === ch.id ? 'page' : undefined}
                      className={`w-full text-left px-3 py-3 text-sm md:py-2 rounded-lg transition ${
                        quranChapter === ch.id
                          ? "bg-green-100 text-green-800 font-semibold dark:bg-sage-900/40 dark:text-sage-300"
                          : "text-gray-700 dark:text-night-300 hover:bg-gray-100 dark:hover:bg-night-700"
                      }`}
                    >
                      {quranChapters.find(item => item.id === ch.id)?.label || ch.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // 圣训集列表
              <>
              {collectionsLoading && <LoadingState label="正在加载圣训目录…" count={2} />}
              {collectionsError && <RequestError message={collectionsError} onRetry={() => setCollectionsAttempt(value => value + 1)} />}
              {collections.map(coll => (
              <div key={coll.id} className="border-b border-gray-200 dark:border-night-700 pb-2 md:pb-3">
                {/* 圣训集 */}
                <button
                  onClick={() => toggleCollection(coll.id)}
                  aria-expanded={openCollections.has(coll.id)}
                  className={`w-full flex items-center justify-between py-2 px-2 md:px-3 rounded-lg hover:bg-green-50 dark:hover:bg-sage-900/20 transition ${activeCollectionId === coll.id ? 'bg-green-50 text-green-700 dark:bg-sage-900/20 dark:text-sage-400' : ''}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {openCollections.has(coll.id) ? 
                      <ChevronDown className="w-4 h-4 text-green-600 dark:text-sage-400 flex-shrink-0" /> : 
                      <ChevronRight className="w-4 h-4 text-gray-500 dark:text-night-400 flex-shrink-0" />
                    }
                    <span className="font-semibold text-xs md:text-sm truncate">{coll.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-night-400 ml-2 flex-shrink-0">{coll.total_hadiths} 段</span>
                </button>

                {/* 章节列表 */}
                {openCollections.has(coll.id) && coll.chapters && coll.chapters.length > 0 && (
                  <div className="ml-4 md:ml-6 mt-2 space-y-1">
                    {coll.chapters.map((ch) => {
                      const chapterKey = `${coll.id}-${ch.name}`;
                      const isActiveChapter = viewMode === 'chapter' && selection?.collection === coll.id && selection?.chapter === ch.name;
                      return (
                        <div key={chapterKey}>
                          <button
                            onClick={() => loadChapterHadiths(coll.id, ch.name)}
                            aria-current={isActiveChapter ? 'page' : undefined}
                            className={`w-full text-left py-2.5 md:py-1.5 px-2 md:px-3 rounded-lg transition flex items-center justify-between group text-sm ${isActiveChapter ? 'bg-green-100 text-green-800 font-semibold dark:bg-sage-900/40 dark:text-sage-300' : 'hover:bg-gray-100 dark:hover:bg-night-700'}`}
                          >
                            <span className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`text-sm md:text-xs truncate ${isActiveChapter ? 'text-green-800 dark:text-sage-300' : 'text-gray-700 dark:text-night-300'}`}>
                                {ch.display_name || ch.name}
                              </span>
                            </span>
                            <span className={`text-xs px-1.5 md:px-2 py-0.5 rounded flex-shrink-0 ml-2 ${isActiveChapter ? 'bg-green-200 text-green-800 dark:bg-sage-800 dark:text-sage-200' : 'bg-gray-100 dark:bg-night-700'}`}>
                              {ch.count}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
              </>
            )}
          </div>
          </div>
        </div>

        {/* 右侧主内容区 - 自然流式布局，无滚动限制 */}
        <div className="flex-1 min-w-0">
          {/* 古兰经内容 */}
          {contentType === "quran" && (
            <div ref={quranTopRef} className="space-y-6 scroll-mt-24" aria-busy={quranLoading}>
              {quranLoading ? (
                <LoadingState kind="quran" label="正在加载古兰经章节…" />
              ) : quranError ? (
                <RequestError message={quranError} onRetry={() => loadQuranChapter(quranChapter)} />
              ) : quranData ? (
                <QuranExperience playbackMode={quranPlaybackMode} onPlaybackModeChange={setQuranPlaybackMode} arab={quranData} reciters={reciters} reciterData={reciterData}
                  reciter={reciter} onReciterChange={setReciterId}
                  chapters={chapterCatalog.data?.chapters || []} onChapterChange={loadQuranChapter} onOpenDirectory={openDirectory}
                  readingOptions={readingOptions.data} onScriptChange={script => changeReading({ script })}
                  onTranslationChange={translation => changeReading({ translation })} />
              ) : (
                <div className="text-center py-12 md:py-20 text-gray-500 dark:text-night-400 text-sm md:text-base">
                  请从左侧选择章节
                </div>
              )}
            </div>
          )}

          {/* 全站共用每日圣训，侧栏与主区读取同一份数据。 */}
          {contentType === "hadith" && viewMode === "daily" && (
            <div ref={overviewTopRef} className="mb-6 scroll-mt-24 md:mb-8">
              <DailyHadithCard variant="feature" />
            </div>
          )}

          {/* 搜索框（仅圣训模式显示） */}
          {contentType === "hadith" && (
          <div ref={searchTopRef} className="mb-6 md:mb-8 scroll-mt-24">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-night-400">
              <span>搜索范围：{activeCollection?.name || '全部圣训集'}</span>
              {activeCollectionId !== null && (
                <button onClick={showAllCollections} className="text-green-700 hover:underline dark:text-sage-400">
                  返回全部圣训集
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder={activeCollection ? `搜索《${activeCollection.name}》全部篇章` : '搜索全部圣训集：礼拜、斋月、父母、婚姻、诚信...'}
                className="flex-1 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg rounded-xl border border-gray-300 dark:border-night-600 bg-white dark:bg-night-800 focus:outline-none focus:ring-4 focus:ring-green-500/30"
              />
              <button
                onClick={search}
                className="px-6 md:px-10 py-3 md:py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 md:gap-3 text-base md:text-lg font-medium transition"
              >
                <Search className="w-5 h-5 md:w-6 md:h-6" />
                <span>搜索</span>
              </button>
            </div>
            {activeCollectionId === null && collections.length > 0 && (
              <p className="mt-2 text-xs md:text-sm leading-relaxed text-gray-500 dark:text-night-400">
                可搜索：{collections.map(collection => collection.name).join('、')}。支持正文关键词、篇章名称、编号或圣训集名称。
              </p>
            )}
          </div>
          )}

          {/* 圣训集介绍 */}
          {contentType === 'hadith' && viewMode === 'collection' && (
            <div className="mb-6 scroll-mt-24" aria-busy={collectionLoading}>
              {collectionLoading ? <LoadingState kind="article" label="正在加载圣训集介绍…" /> : collectionError ? (
                <RequestError message={collectionError} onRetry={() => setCollectionRequest(value => value + 1)} />
              ) : <HadithCollectionIntro collection={collectionDetail} />}
            </div>
          )}

          {/* 结果列表（仅圣训模式显示） */}
          {contentType === "hadith" && viewMode !== 'collection' && (
            loadError && !loading ? <RequestError message={loadError} onRetry={() => setRetryAttempt(value => value + 1)} /> : loading ? (
              <LoadingState kind="hadith" label="正在加载圣训…" />
            ) : viewMode === "daily" && hadiths.length === 0 ? (
              <div className="text-center py-12 md:py-20 text-gray-500 dark:text-night-400 text-sm md:text-base">
                从左侧选择章节或使用搜索框查找圣训
              </div>
            ) : hadiths.length === 0 ? (
              <div className="text-center py-12 md:py-20 text-gray-500 dark:text-night-400 text-sm md:text-base">
                {viewMode === "search" ? "未找到相关圣训" : "该章节暂无圣训"}
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {viewMode === "chapter" && hadiths.length > 0 && (
                  <div className="mb-3 md:mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-green-700 dark:text-sage-400">
                      {hadiths[0].chapter}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-night-400 mt-1">
                      共 {count} 段正文
                    </p>
                  </div>
                )}
                {hadiths.map((h, index) => (
                  <div
                    key={h.id}
                  >
                    {h.chapter_intro && (
                      <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-night-700 dark:bg-night-800/50 md:p-5">
                        <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-700 dark:text-night-200">
                          <Book className="h-4 w-4" aria-hidden="true" />篇前说明
                        </h4>
                        <HadithText text={h.chapter_intro} highlight={searchHighlight} className="text-sm leading-7 text-gray-600 dark:text-night-300" />
                      </div>
                    )}
                    {h.section && (index === 0 || h.section.key !== hadiths[index - 1].section?.key) && (
                      <div className="mt-6 mb-3 border-l-4 border-green-600 pl-3 md:pl-4">
                        {viewMode === 'search' && (
                          <p className="mb-1 text-sm text-gray-500 dark:text-night-400"><HighlightedText text={h.collection_name} query={searchHighlight} /> · <HighlightedText text={h.chapter} query={searchHighlight} /></p>
                        )}
                        <h4 className="text-lg md:text-xl font-semibold text-green-700 dark:text-sage-400">
                          {!h.section.is_supplement && h.section.number != null ? `第 ${h.section.number} 节${h.section.title ? '：' : ''}` : ''}<HighlightedText text={h.section.title} query={searchHighlight} />
                        </h4>
                        <p className="mt-1 text-sm text-gray-500 dark:text-night-400">
                          本节共 {h.section.count} 段正文
                          {h.section_hadith_number > 1 && ` · 当前从本节第 ${h.section_hadith_number} 段显示`}
                        </p>
                        {h.section_intro && <HadithText text={h.section_intro} highlight={searchHighlight} className="mt-3 text-sm leading-7 text-gray-600 dark:text-night-300" />}
                      </div>
                    )}
                    <div id={`hadith-${h.id}`} className={`scroll-mt-24 bg-white dark:bg-night-800 rounded-xl md:rounded-2xl shadow-md border border-gray-200 dark:border-night-700 hover:shadow-lg transition p-4 md:p-6 ${highlightedHadithId === h.id ? directoryStyles.targetFlash : ''}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                      {viewMode === "search" && !h.section && (
                        <h3 className="text-lg md:text-xl font-bold text-green-700 dark:text-sage-400">
                          <HighlightedText text={h.chapter} query={searchHighlight} />
                        </h3>
                      )}
                      <span className="text-base md:text-lg font-semibold text-green-600 dark:text-sage-400 flex items-center gap-2">
                        <Hash className="w-4 h-4 md:w-5 md:h-5" />
                        <HighlightedText text={h.section ? h.section_hadith_number : h.collection_number} query={searchHighlight} />
                      </span>
                      {h.section && (
                        <span className="text-xs md:text-sm text-gray-500 dark:text-night-400">
                          <HadithOriginalNumber originalNumber={h.original_number} />
                        </span>
                      )}
                    </div>
                    <HadithText text={h.body ?? h.text} highlight={searchHighlight} className="text-base md:text-lg leading-7 md:leading-8 text-gray-800 dark:text-night-200" />
                    <HadithNotes notes={h.notes} highlight={searchHighlight} />
                    {h.collection_name && (
                      <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-night-400">
                        <HighlightedText text={h.collection_name} query={searchHighlight} />
                      </p>
                    )}
                    </div>
                  </div>
                ))}
                {readerBar && <HadithReaderBar {...readerBar} onOpenDirectory={openDirectory}
                  onTop={() => searchTopRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })} />}
              </div>
            )
          )}

          {!readingBarShown && !playerShown && (
            <ReaderDock label="经训导航" className="md:hidden">
              <div className="flex items-center justify-between gap-2">
                <DirectoryButton onOpen={openDirectory} label />
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
                  className="inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm text-gray-600 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-night-300 dark:active:bg-night-800">
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />回到顶部
                </button>
              </div>
            </ReaderDock>
          )}
        </div>
      </div>
    </div>
  );
}

export default HadithDetailPage;
