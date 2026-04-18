'use client'

import { useState, useRef, useEffect } from 'react'

export default function ChatPanel({ graph, onOperations }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('minimax')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    if (!open) setOpen(true)

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          graph,
          model,
        }),
      })

      const data = await res.json()
      const ops = Array.isArray(data.operations) ? data.operations : []
      if (ops.length > 0) onOperations(ops)

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply ?? 'Done.',
          operations: ops,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.', operations: [], timestamp: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 flex flex-col"
      style={{ width: 'min(660px, calc(100vw - 2rem))' }}
    >
      {/* ── Message history (slides up when open) ── */}
      <div
        className={`flex flex-col transition-all duration-300 ease-out overflow-hidden ${
          open ? 'max-h-105 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="mx-3 rounded-t-2xl bg-white/90 backdrop-blur-md border border-slate-200 border-b-0 shadow-2xl shadow-slate-300/40 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300" />
              <span className="text-xs font-semibold text-slate-700 tracking-tight">AI Decision Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-slate-100 p-0.5 text-[11px]">
                <button
                  onClick={() => setModel('minimax')}
                  className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                    model === 'minimax' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Minimax
                </button>
                <button
                  onClick={() => setModel('claude')}
                  className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                    model === 'claude' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Claude
                </button>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 max-h-80">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-lg mb-3 shadow-lg shadow-blue-200">
                  ✦
                </div>
                <p className="text-xs font-semibold text-slate-600">Describe your decision problem</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                  e.g. "Should I invest £1000? 70% chance to win £500, 30% to lose £200"
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] shrink-0 mb-0.5 shadow-sm">
                    ✦
                  </div>
                )}
                <div className={`flex flex-col gap-1 max-w-[78%]`}>
                  <div
                    className={`px-3 py-2 text-xs leading-relaxed rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-linear-to-br from-blue-600 to-blue-700 text-white rounded-br-sm shadow-sm shadow-blue-200'
                        : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.operations?.length > 0 && (
                    <span className="text-[10px] text-slate-400 ml-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                      {msg.operations.length} graph change{msg.operations.length !== 1 ? 's' : ''} applied
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-lg bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] shrink-0 shadow-sm">
                  ✦
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* ── Input bar (always visible) ── */}
      <div className={`mx-3 mb-3 ${open ? '' : ''}`}>
        <div className={`flex items-center gap-2 bg-white border shadow-xl px-4 py-2.5 transition-all duration-200 ${
          open
            ? 'rounded-b-2xl border-slate-200 shadow-slate-300/40'
            : 'rounded-2xl border-slate-200 shadow-slate-200/60 hover:shadow-slate-300/50'
        }`}>

          {/* Icon / open trigger */}
          {!open && (
            <div className="w-6 h-6 rounded-lg bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] shrink-0 shadow-sm">
              ✦
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => !open && setOpen(true)}
            placeholder={open ? 'Ask a follow-up...' : 'Ask AI to build your decision graph...'}
            disabled={loading}
            rows={1}
            className="flex-1 text-xs text-slate-900 bg-transparent resize-none focus:outline-none placeholder:text-slate-400 disabled:opacity-50 leading-relaxed"
            style={{ minHeight: '20px', maxHeight: '80px' }}
          />

          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-7 h-7 rounded-xl bg-linear-to-br from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-all shadow-sm shadow-blue-200"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 6h10M7 2l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {open && (
          <p className="text-center text-[10px] text-slate-400 mt-1.5">
            Enter to send · Shift+Enter for newline
          </p>
        )}
      </div>
    </div>
  )
}
