import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, ChevronUp, ChevronDown, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useActions } from '../../contexts/ActionContext.jsx';

export default function ConsultBar({ collapsed, onToggleCollapse, onSendMessage, messages, isLoading }) {
  const { theme, themeId } = useTheme();
  const { actions, pinnedIds, getPinnedActions, getDescription } = useActions();
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    // Attach pinned action references automatically
    const pinned = getPinnedActions();
    const context = pinned.length > 0
      ? pinned.map(a => `#${a.num}: ${getDescription(a, lang)}`).join('\n')
      : null;
    onSendMessage(text, context);
    setInput('');
  };

  // Insert action reference (#N) via click
  const insertActionRef = (num) => {
    setInput(prev => prev + ` #${num} `);
    inputRef.current?.focus();
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`absolute bottom-0 left-0 right-0 z-20 ${theme.bgPanel} border-t ${theme.border} px-4 py-2 flex items-center gap-2`}
      >
        <Bot size={14} className={theme.textMuted} />
        <span className={`text-[11px] ${theme.textMuted} ${monoCls}`}>
          {lang === 'ko' ? 'AI 상담 열기' : 'Open AI consultation'}
        </span>
        <ChevronUp size={12} className={theme.textMuted} />
        {messages.length > 0 && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold`}>
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`${theme.bgPanel} border-t ${theme.border} flex flex-col`} style={{ maxHeight: '40vh' }}>
      {/* Header */}
      <div className={`px-3 py-1.5 border-b ${theme.border} flex items-center gap-2`}>
        <Bot size={14} className={theme.text} />
        <span className={`text-xs font-bold ${theme.text} ${monoCls} flex-1`}>
          {lang === 'ko' ? 'AI 상담' : 'AI Consultation'}
        </span>
        {pinnedIds.size > 0 && (
          <span className={`text-[9px] ${theme.textMuted} ${monoCls}`}>
            📌 {pinnedIds.size} {lang === 'ko' ? '참조' : 'refs'}
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1 rounded ${theme.textMuted} hover:${theme.text}`}
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[60px]">
        {messages.length === 0 ? (
          <div className={`text-center text-[11px] ${theme.textDim} ${monoCls} py-4`}>
            {lang === 'ko'
              ? '구조에 대해 물어보거나 수정을 요청하세요.\n액션을 고정(📌)하면 참조할 수 있어요.'
              : 'Ask about the structure or request changes.\nPin (📌) actions to reference them.'}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${monoCls} ${
                msg.role === 'user'
                  ? (themeId === 'dark' ? 'bg-[#0e639c] text-white' : themeId === 'light' ? 'bg-[#0066b8] text-white' : 'bg-stone-800 text-white')
                  : (themeId === 'dark' ? 'bg-[#2d2d30] text-[#cccccc]' : themeId === 'light' ? 'bg-[#f3f3f3] text-[#1e1e1e]' : 'bg-amber-50 text-stone-800')
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mb-1 opacity-70">
                    <Bot size={10} /> AI
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className={`mt-2 pt-2 border-t ${msg.role === 'user' ? 'border-white/20' : theme.border} space-y-1`}>
                    {msg.actions.map((a, i) => (
                      <div key={i} className="text-[10px] opacity-80">
                        {a.icon || '•'} #{a.num}: {a.description}
                      </div>
                    ))}
                  </div>
                )}
                {msg.proposal && (
                  <div className={`mt-2 pt-2 border-t ${msg.role === 'user' ? 'border-white/20' : theme.border}`}>
                    <div className="flex gap-1 mt-1">
                      <button className="px-2 py-1 text-[10px] font-bold bg-emerald-500 text-white rounded">
                        {lang === 'ko' ? '승인' : 'Accept'}
                      </button>
                      <button className="px-2 py-1 text-[10px] font-bold bg-amber-500 text-white rounded">
                        {lang === 'ko' ? '부분 선택' : 'Partial'}
                      </button>
                      <button className={`px-2 py-1 text-[10px] font-bold rounded ${theme.button}`}>
                        {lang === 'ko' ? '거부' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`px-3 py-2 rounded-lg ${theme.bgAlt} flex items-center gap-2`}>
              <Loader size={12} className={`${theme.textMuted} animate-spin`} />
              <span className={`text-[11px] ${theme.textMuted} ${monoCls}`}>
                {lang === 'ko' ? '분석 중...' : 'Analyzing...'}
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Recent actions quick-insert */}
      {actions.length > 0 && (
        <div className={`px-3 py-1 border-t ${theme.border} flex items-center gap-1 overflow-x-auto`}>
          <span className={`text-[9px] ${theme.textDim} ${monoCls} flex-shrink-0`}>
            {lang === 'ko' ? '참조:' : 'ref:'}
          </span>
          {actions.slice(-8).reverse().map(a => (
            <button
              key={a.id}
              onClick={() => insertActionRef(a.num)}
              className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded border ${monoCls} ${
                pinnedIds.has(a.id)
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : `${theme.bgAlt} ${theme.border} ${theme.textMuted}`
              }`}
              title={getDescription(a, lang)}
            >
              #{a.num}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={`px-3 py-2 border-t ${theme.border} flex items-center gap-2`}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={lang === 'ko' ? '"수익화 파트를 세분화해줘" 또는 "#3 기반으로 확장"' : '"Break down monetization" or "expand from #3"'}
          className={`flex-1 px-3 py-2 text-xs border rounded-lg focus:outline-none ${monoCls} ${theme.input}`}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={`p-2 rounded-lg disabled:opacity-40 ${theme.buttonPrimary}`}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
