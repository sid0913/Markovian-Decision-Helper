'use client'

export default function EdgeSidebar({ edge, nodes, onChange, onDelete }) {
  if (!edge) return null

  const sourceNode = nodes?.find(n => n.id === edge.source)
  const targetNode = nodes?.find(n => n.id === edge.target)
  const isActionEdge = sourceNode?.type === 'action'

  return (
    <div className="p-3 border-b border-slate-200">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Edge Properties</p>

      <div className="text-xs text-slate-500 mb-3">
        <span className="font-medium text-slate-700">{sourceNode?.label ?? '?'}</span>
        {' → '}
        <span className="font-medium text-slate-700">{targetNode?.label ?? '?'}</span>
      </div>

      {isActionEdge ? (
        <>
          <label className="block text-xs text-slate-500 mb-1">Probability</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            placeholder="e.g. 0.7"
            value={edge.probability ?? ''}
            onChange={e => {
              const v = e.target.value === '' ? null : parseFloat(e.target.value)
              onChange({ probability: v })
            }}
            className="w-full text-xs text-slate-900 bg-white border border-slate-200 rounded px-2 py-1.5 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </>
      ) : (
        <p className="text-xs text-slate-400 italic mb-3">State → Action edges have no probability.</p>
      )}

      <button
        onClick={onDelete}
        className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded px-2 py-1.5 transition-colors"
      >
        Delete Edge
      </button>
    </div>
  )
}
