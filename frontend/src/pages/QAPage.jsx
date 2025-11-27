// src/pages/QAPage.jsx  —— 左侧提问侧边栏，右侧问答列表
import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { MessageSquare, Menu, X } from 'lucide-react';

const QASkeleton = () => (
  <div className="space-y-6">
    {[1, 2].map(i => (
      <div key={i} className="animate-pulse">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
        <div className="mt-3 h-16 bg-gray-100 dark:bg-gray-700 rounded"></div>
      </div>
    ))}
  </div>
);

export default function QAPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端侧边栏开关

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const fetchQuestions = async () => {
    try {
      const res = await apiClient.get('/qa/questions/');
      setQuestions(res.data.results || res.data);
    } catch (err) {
      showMsg('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/qa/questions/', { content: content.trim() });
      setContent('');
      showMsg('提问成功，等待审核');
    } catch (err) {
      showMsg('提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, []);

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900 transition-colors relative" style={{ height: 'calc(100vh - 200px)', minHeight: 'calc(100vh - 200px)' }}>
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 左侧提问侧边栏 */}
      <div
        className={`fixed md:static inset-y-0 left-0 w-80 bg-white dark:bg-gray-800 shadow-lg  border-r border-gray-200 dark:border-gray-700 z-50 md:z-auto transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
              我要提问
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* 消息 */}
          {msg.text && (
            <div 
              className={`mb-4 p-3 rounded text-center text-sm font-medium ${
                msg.type === 'error' 
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <textarea
              rows={8}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="写下你的问题…（礼貌清晰更容易被解答）"
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={submitting}
            />

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className={`w-full py-3 rounded-lg font-medium transition ${
                submitting || !content.trim()
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {submitting ? '提交中…' : '提交问题'}
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              提交后需审核，请耐心等待
            </p>
          </form>
        </div>
      </div>

      {/* 右侧问答列表主内容区 */}
      <div className="flex-1  w-full md:w-auto bg-gray-50 dark:bg-gray-900 h-full">
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
              <MessageSquare className="w-5 h-5" />
              问答
            </h2>
            <div className="w-10" /> {/* 占位符，保持居中 */}
          </div>

          {/* 问答列表 */}
          <div className="space-y-3">
            {loading ? (
              <QASkeleton />
            ) : questions.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <div className="text-6xl mb-4 opacity-30 dark:opacity-20">💬</div>
                <p className="text-lg">暂无公开问题</p>
                <p className="text-sm mt-1">快来提出第一个问题吧</p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <article 
                  key={q.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md"
                >
                  {/* 问题区域 - 使用左侧边框和不同背景色突出显示 */}
                  <div className="p-3 md:p-4 border-l-4 border-blue-500 bg-blue-50/30 dark:bg-gray-800">
                    <div className="flex justify-between items-center text-xs mb-2 text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.author_name || '匿名用户'}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          提问
                        </span>
                      </div>
                      <time>{new Date(q.created_at).toLocaleDateString('zh-CN')}</time>
                    </div>
                    <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-100 leading-snug">
                      {q.content}
                    </h3>
                  </div>

                  {/* 回答区域 - 使用不同的视觉样式 */}
                  {q.answers?.length > 0 ? (
                    <div className="p-3 md:p-4 space-y-3 bg-gray-50 dark:bg-gray-700/50">
                      {q.answers.map((a, i) => (
                        <div 
                          key={a.id} 
                          className="p-3 rounded-lg border-l-4 border-green-500 bg-green-50/30 dark:bg-gray-800"
                        >
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-green-700 dark:text-green-400 font-medium text-xs">
                                {a.author_name || '管理员'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                回答
                              </span>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400">
                              {new Date(a.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {a.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 md:p-4 bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">
                        等待回复中…
                      </p>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}