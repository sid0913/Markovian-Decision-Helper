'use client'

export default function NodeSidebar({ node, onChange, onDelete }) {
  if (!node) return null

  const typeLabel = node.type === 'state' ? 'State' : 'Action'
  const typeColor = node.type === 'state' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'

  return (
    <div className="p-3 border-b border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Node Properties</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
          {typeLabel}
        </span>
      </div>

      <label className="block text-xs text-slate-500 mb-1">Label</label>
      <input
        type="text"
        value={node.label ?? ''}
        onChange={e => onChange({ label: e.target.value })}
        className="w-full text-xs text-slate-900 bg-white border border-slate-200 rounded px-2 py-1.5 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      <label className="block text-xs text-slate-500 mb-1">Reward</label>
      <input
        type="number"
        placeholder="e.g. 10"
        value={node.reward ?? ''}
        onChange={e => {
          const v = e.target.value === '' ? null : parseFloat(e.target.value)
          onChange({ reward: v })
        }}
        className="w-full text-xs text-slate-900 bg-white border border-slate-200 rounded px-2 py-1.5 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      {node.computedValue != null && (
        <div className="text-xs text-slate-500 mb-3">
          <span className="font-medium">{node.type === 'state' ? 'V(s)' : 'Q(s,a)'}</span>
          {' = '}
          <span className="font-bold text-blue-600">{node.computedValue.toFixed(4)}</span>
        </div>
      )}

      <button
        onClick={onDelete}
        className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded px-2 py-1.5 transition-colors"
      >
        Delete Node
      </button>
    </div>
  )
}
