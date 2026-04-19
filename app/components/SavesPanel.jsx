'use client'

import { useState, useEffect } from 'react'
import { listSaves, saveNamed, deleteSave } from '@/lib/storage'

export default function SavesPanel({ graph, onLoad }) {
  const [open, setOpen] = useState(false)
  const [saves, setSaves] = useState([])
  const [name, setName] = useState('')
  const [flash, setFlash] = useState(null) // 'saved' | 'loaded'

  useEffect(() => {
    if (open) setSaves(listSaves())
  }, [open])

  function handleSave() {
    const n = name.trim() || `Graph ${new Date().toLocaleString()}`
    saveNamed(n, graph)
    setSaves(listSaves())
    setName('')
    setFlash('saved')
    setTimeout(() => setFlash(null), 1800)
  }

  function handleLoad(save) {
    onLoad({ nodes: save.nodes, edges: save.edges })
    setOpen(false)
    setFlash('loaded')
    setTimeout(() => setFlash(null), 1800)
  }

  function handleDelete(id) {
    deleteSave(id)
    setSaves(listSaves())
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`text-xs px-2.5 py-1.5 border rounded-md font-medium transition-colors flex items-center gap-1.5 ${
          flash === 'saved'
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="3.5" y="1" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="2.5" y="6" width="7" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        {flash === 'saved' ? 'Saved!' : 'Saves'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">

            {/* Save current graph */}
            <div className="p-3 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Save current graph</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="flex-1 text-xs text-slate-900 bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={handleSave}
                  className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shrink-0"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Saved graphs list */}
            <div className="max-h-64 overflow-y-auto">
              {saves.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">No saved graphs yet</p>
              ) : (
                saves.map(save => (
                  <div key={save.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{save.name}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(save.date)} · {save.nodes.length} nodes</p>
                    </div>
                    <button
                      onClick={() => handleLoad(save)}
                      className="text-[11px] px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-medium transition-colors shrink-0"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(save.id)}
                      className="text-[11px] px-2 py-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
