'use client'

import { useState, useRef, useEffect } from 'react'

export default function ChatPanel({ open, onClose, graph, onOperations }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('minimax')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

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

      if (ops.length > 0) {
        onOperations(ops)
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply ?? 'Done.',
          operations: ops,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Network error. Please try again.',
          operations: [],
          timestamp: new Date().toISOString(),
        },
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

  if (!open) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">AI Assistant</span>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="minimax">Minimax</option>
            <option value="claude">Claude</option>
          </select>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-xs mt-8">
            <div className="text-3xl mb-2">🤖</div>
            <p className="font-medium">Describe your decision</p>
            <p className="mt-1 text-slate-300">
              e.g. "Should I invest £1000? 70% chance to win £500, 30% to lose £200"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-slate-100 text-slate-700 rounded-tl-sm'
              }`}
            >
              <p>{msg.content}</p>
              {msg.role === 'assistant' && msg.operations?.length > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Applied {msg.operations.length} graph change{msg.operations.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-slate-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your decision..."
            disabled={loading}
            rows={2}
            className="flex-1 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
