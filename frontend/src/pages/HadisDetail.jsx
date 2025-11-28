import { useState, useEffect } from "react";
import apiClient from "../utils/apiClient";
import { Search, BookOpen, Sparkles, ChevronDown, ChevronRight, Hash, Menu, X, Book } from "lucide-react";

function HadithDetailPage() {
  const [query, setQuery] = useState("");
  const [hadiths, setHadiths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [daily, setDaily] = useState(null);
  
  // 侧边栏相关状态
  const [collections, setCollections] = useState([]);
  const [openCollections, setOpenCollections] = useState(new Set());
  const [openChapters, setOpenChapters] = useState(new Set());
  const [viewMode, setViewMode] = useState("daily"); // 'daily', 'search', 'chapter'
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端侧边栏开关
  
  // 古兰经相关状态
  const [contentType, setContentType] = useState("hadith"); // 'hadith' 或 'quran'
  const [quranChapter, setQuranChapter] = useState(1);
  const [quranData, setQuranData] = useState({ arab: null, zh: null });
  const [quranLoading, setQuranLoading] = useState(false);
  const [quranError, setQuranError] = useState(null);
  

  const API_BASE = "hadith/hadiths/";

  // 获取所有圣训集
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await apiClient.get("hadith/collections/");
        setCollections(res.data.results || res.data || []);
      } catch (error) {
        console.error("获取圣训集失败:", error);
        setCollections([]);
      }
    };
    fetchCollections();
  }, []);

  // 获取每日圣训
  const getDaily = async () => {
    try {
      const res = await apiClient.get(API_BASE + "daily/");
      setDaily(res.data);
    } catch (error) {
      console.error("获取每日圣训失败:", error);
    }
  };

  useEffect(() => {
    getDaily();
  }, []);

  // 搜索功能
  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setViewMode("search");
    try {
      const res = await apiClient.get(API_BASE, { params: { search: query } });
      setHadiths(res.data.results || res.data || []);
    } catch (error) {
      console.error("搜索失败:", error);
      setHadiths([]);
    } finally {
      setLoading(false);
    }
  };

  // 切换圣训集展开
  const toggleCollection = (id) => {
    const newOpen = new Set(openCollections);
    if (newOpen.has(id)) newOpen.delete(id);
    else newOpen.add(id);
    setOpenCollections(newOpen);
  };

  // 切换章节展开
  const toggleChapter = (chapterKey) => {
    const newOpen = new Set(openChapters);
    if (newOpen.has(chapterKey)) newOpen.delete(chapterKey);
    else newOpen.add(chapterKey);
    setOpenChapters(newOpen);
  };

  // 加载章节圣训
  const loadChapterHadiths = async (collectionId, chapterName) => {
    setLoading(true);
    setViewMode("chapter");
    // 移动端加载章节后自动关闭侧边栏
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    try {
      const res = await apiClient.get(API_BASE, {
        params: {
          collection: collectionId,
          chapter: chapterName,
        }
      });
      setHadiths(res.data.results || res.data || []);
    } catch (err) {
      console.error("加载章节圣训失败:", err);
      setHadiths([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载古兰经章节
  const loadQuranChapter = async (chapter) => {
    setQuranLoading(true);
    setQuranError(null);
    setQuranChapter(chapter);
    // 移动端加载后自动关闭侧边栏
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    try {
      const [arabRes, zhRes] = await Promise.all([
        fetch(`/api/hadith/quran/quran-uthmani/${chapter}/`).then(r => {
          if (!r.ok) throw new Error(`阿拉伯文加载失败: ${r.status}`);
          return r.json();
        }),
        fetch(`/api/hadith/quran/zho-majian/${chapter}/`).then(r => {
          if (!r.ok) throw new Error(`中文翻译加载失败: ${r.status}`);
          return r.json();
        }),
      ]);
      
      // 检查是否有错误信息
      if (arabRes.error) throw new Error(arabRes.error);
      if (zhRes.error) throw new Error(zhRes.error);
      
      // 确保数据格式正确
      if (!arabRes.verses || !Array.isArray(arabRes.verses)) {
        console.error('阿拉伯文数据格式错误:', arabRes);
      }
      if (!zhRes.verses || !Array.isArray(zhRes.verses)) {
        console.error('中文翻译数据格式错误:', zhRes);
      }
      
      setQuranData({ arab: arabRes, zh: zhRes });
    } catch (err) {
      console.error("加载古兰经失败:", err);
      setQuranError(err.message || '加载失败，请稍后重试');
      setQuranData({ arab: null, zh: null });
    } finally {
      setQuranLoading(false);
    }
  };

  // 生成古兰经章节列表（共114章）
  const quranChapters = Array.from({ length: 114 }, (_, i) => i + 1);

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900 transition-colors relative" style={{ height: 'calc(100vh - 200px)', minHeight: 'calc(100vh - 200px)' }}>
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 左侧侧边栏 */}
      <div
        className={`fixed md:static inset-y-0 left-0 w-80 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto border-r border-gray-200 dark:border-gray-700 z-50 md:z-auto transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
              经训大全
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 内容类型切换 */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => {
                setContentType("hadith");
                setViewMode("daily");
              }}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                contentType === "hadith"
                  ? "bg-white dark:bg-gray-600 text-green-700 dark:text-green-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1" />
              圣训
            </button>
            <button
              onClick={() => {
                setContentType("quran");
                if (!quranData.arab) {
                  loadQuranChapter(1);
                }
              }}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                contentType === "quran"
                  ? "bg-white dark:bg-gray-600 text-green-700 dark:text-green-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <Book className="w-4 h-4 inline mr-1" />
              古兰经
            </button>
          </div>
        </div>

        <div className="p-3 md:p-4 space-y-2 md:space-y-3">
          {contentType === "quran" ? (
            // 古兰经章节列表
            <div className="space-y-1">
              <div className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                古兰经章节（共114章）
              </div>
              <div className="grid grid-cols-6 gap-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                {quranChapters.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => loadQuranChapter(ch)}
                    className={`px-2 py-2 text-xs md:text-sm rounded-lg transition ${
                      quranChapter === ch
                        ? "bg-green-600 text-white dark:bg-green-500"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // 圣训集列表
            collections.map(coll => (
            <div key={coll.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 md:pb-3">
              {/* 圣训集 */}
              <button
                onClick={() => toggleCollection(coll.id)}
                className="w-full flex items-center justify-between py-2 px-2 md:px-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {openCollections.has(coll.id) ? 
                    <ChevronDown className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" /> : 
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  }
                  <span className="font-semibold text-xs md:text-sm truncate">{coll.name}</span>
                </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">{coll.total_hadiths} 段</span>
              </button>

              {/* 章节列表 */}
              {openCollections.has(coll.id) && coll.chapters && coll.chapters.length > 0 && (
                <div className="ml-4 md:ml-6 mt-2 space-y-1">
                  {coll.chapters.map((ch) => {
                    const chapterKey = `${coll.id}-${ch.name}`;
                    return (
                      <div key={chapterKey}>
                        <button
                          onClick={() => {
                            toggleChapter(chapterKey);
                            loadChapterHadiths(coll.id, ch.name);
                          }}
                          className="w-full text-left py-1.5 px-2 md:px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-between group text-xs md:text-sm"
                        >
                          <span className="flex items-center gap-2 flex-1 min-w-0">
                            {openChapters.has(chapterKey) ? 
                              <ChevronDown className="w-3 h-3 flex-shrink-0" /> : 
                              <ChevronRight className="w-3 h-3 flex-shrink-0" />
                            }
                            <span className="text-gray-700 dark:text-gray-300 text-xs truncate">
                              {ch.name}
                            </span>
                          </span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 md:px-2 py-0.5 rounded flex-shrink-0 ml-2">
                            {ch.count}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
          )}
        </div>
      </div>

      {/* 右侧主内容区 */}
      <div className="flex-1 overflow-y-auto w-full md:w-auto bg-gray-50 dark:bg-gray-900 h-full">
        <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-6">
          {/* 移动端顶部栏 */}
          <div className="md:hidden mb-4 flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <h2 className="text-lg font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
              {contentType === "quran" ? (
                <>
                  <Book className="w-5 h-5" />
                  古兰经
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  圣训大全
                </>
              )}
            </h2>
            <div className="w-10" /> {/* 占位符，保持居中 */}
          </div>

          {/* 古兰经内容 */}
          {contentType === "quran" && (
            <div className="space-y-6">
              {quranLoading ? (
                <div className="text-center py-12 md:py-20 text-base md:text-lg dark:text-gray-300">
                  加载中...
                </div>
              ) : quranError ? (
                <div className="text-center py-12 md:py-20">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 md:p-6">
                    <p className="text-red-700 dark:text-red-400 text-sm md:text-base">
                      错误: {quranError}
                    </p>
                  </div>
                </div>
              ) : quranData.arab && quranData.zh ? (
                <>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-xl">
                    {quranData.arab.chapter_name_ar && (
                      <p className="text-2xl md:text-3xl mb-2 text-center opacity-95" style={{ fontFamily: "Scheherazade New, Arial", direction: "rtl" }} dir="rtl">
                        {quranData.arab.chapter_name_ar}
                      </p>
                    )}
                    <h2 className="text-xl md:text-2xl font-bold mb-2 text-center">
                      {quranData.zh?.chapter_name || quranData.arab?.chapter_name_translation || quranData.arab?.chapter_name || `第 ${quranChapter} 章`}
                    </h2>
                    <p className="text-sm md:text-base text-center opacity-90">
                      共 {quranData.arab.verses?.length || 0} 节
                    </p>
                  </div>
                  
                  <div 
                    className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6"
                    style={{ direction: "rtl", fontFamily: "Scheherazade New, Arial" }}
                    dir="rtl"
                  >
                    {quranData.arab.verses.map((v, i) => (
                      <div 
                        key={v.verse} 
                        className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-gray-200 dark:border-gray-700 last:border-b-0 flex flex-col md:flex-row gap-4 md:gap-6"
                        style={{ lineHeight: "2.5" }}
                      >
                        <div 
                          className="flex-1 text-right text-2xl md:text-3xl"
                          style={{ fontFamily: "Scheherazade New, Arial" }}
                        >
                          {v.text} 
                          <small className="text-gray-500 dark:text-gray-400 text-sm md:text-base ml-2">
                            ({v.verse})
                          </small>
                        </div>
                        <div 
                          className="flex-1 text-right text-lg md:text-xl dark:text-gray-300"
                          style={{ 
                            direction: "ltr", 
                            color: "#2c3e50" 
                          }}
                        >
                          {quranData.zh && quranData.zh.verses && quranData.zh.verses[i] ? (
                            quranData.zh.verses[i].text
                          ) : (
                            <span className="text-gray-400 italic">翻译加载中...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 md:py-20 text-gray-500 dark:text-gray-400 text-sm md:text-base">
                  请从左侧选择章节
                </div>
              )}
            </div>
          )}

          {/* 每日圣训 */}
          {contentType === "hadith" && daily && viewMode === "daily" && (
            <div className="mb-6 md:mb-8">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-base md:text-lg font-semibold">今日圣训</span>
                </div>
                <p className="text-base md:text-xl leading-relaxed">「{daily.text}」</p>
                <p className="mt-3 md:mt-4 text-right opacity-90 text-sm md:text-base">
                  —— {daily.collection_name || "圣训集"} 第 {daily.collection_number} 段
                </p>
              </div>
            </div>
          )}

          {/* 搜索框（仅圣训模式显示） */}
          {contentType === "hadith" && (
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="输入关键词：礼拜、斋月、父母、婚姻、诚信..."
                className="flex-1 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-green-500/30"
              />
              <button
                onClick={search}
                className="px-6 md:px-10 py-3 md:py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 md:gap-3 text-base md:text-lg font-medium transition"
              >
                <Search className="w-5 h-5 md:w-6 md:h-6" />
                <span>搜索</span>
              </button>
            </div>
          </div>
          )}

          {/* 结果列表（仅圣训模式显示） */}
          {contentType === "hadith" && (
            loading ? (
              <div className="text-center py-12 md:py-20 text-base md:text-lg dark:text-gray-300">加载中...</div>
            ) : viewMode === "daily" && hadiths.length === 0 ? (
              <div className="text-center py-12 md:py-20 text-gray-500 dark:text-gray-400 text-sm md:text-base">
                从左侧选择章节或使用搜索框查找圣训
              </div>
            ) : hadiths.length === 0 ? (
              <div className="text-center py-12 md:py-20 text-gray-500 dark:text-gray-400 text-sm md:text-base">
                {viewMode === "search" ? "未找到相关圣训" : "该章节暂无圣训"}
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {viewMode === "chapter" && hadiths.length > 0 && (
                  <div className="mb-3 md:mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400">
                      {hadiths[0].chapter}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                      共 {hadiths.length} 段圣训
                    </p>
                  </div>
                )}
                {hadiths.map((h) => (
                  <div
                    key={h.id}
                    className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition p-4 md:p-6"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                      {viewMode === "search" && (
                        <h3 className="text-lg md:text-xl font-bold text-green-700 dark:text-green-400">
                          {h.chapter}
                        </h3>
                      )}
                      <span className="text-base md:text-lg font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                        <Hash className="w-4 h-4 md:w-5 md:h-5" />
                        {h.collection_number}
                      </span>
                    </div>
                    <p className="text-base md:text-lg leading-7 md:leading-8 text-gray-800 dark:text-gray-200">
                      {h.text}
                    </p>
                    {h.collection_name && (
                      <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        {h.collection_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default HadithDetailPage;
