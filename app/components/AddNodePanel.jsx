'use client'

import { useState } from 'react'

export default function AddNodePanel({ onAdd, nodeCount }) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState('state')

  function handleAdd(nodeType) {
    const count = nodeCount ?? 0
    const defaultLabel = nodeType === 'state'
      ? `State ${count + 1}`
      : `Action ${count + 1}`
    const finalLabel = label.trim() || defaultLabel
    const offset = () => (Math.random() - 0.5) * 100
    onAdd(nodeType, finalLabel, {
      x: 300 + offset(),
      y: 200 + offset(),
    })
    setLabel('')
  }

  return (
    <div className="p-3 border-b border-slate-200">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Node</p>
      <input
        type="text"
        placeholder="Label (optional)"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd('state') }}
        className="w-full text-xs text-slate-900 bg-white border border-slate-200 rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <div className="flex gap-2">
        <button
          onClick={() => handleAdd('state')}
          className="flex-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium px-2 py-1.5 rounded transition-colors"
        >
          + State
        </button>
        <button
          onClick={() => handleAdd('action')}
          className="flex-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium px-2 py-1.5 rounded transition-colors"
        >
          + Action
        </button>
      </div>
    </div>
  )
}
