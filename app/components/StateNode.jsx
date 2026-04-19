'use client'

import { Handle, Position } from '@xyflow/react'

export default function StateNode({ data, selected }) {
  const hasValue = data.computedValue != null
  const isRoot = data.isRoot

  let ringClass = 'ring-2 ring-slate-300'
  if (selected) ringClass = 'ring-2 ring-blue-500'
  if (isRoot) ringClass = 'ring-2 ring-amber-400'

  let bgClass = 'bg-white'
  if (hasValue) bgClass = 'bg-blue-50'

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-32 h-32 rounded-full shadow-md ${bgClass} ${ringClass} cursor-pointer select-none`}
    >
      <Handle type="target" position={Position.Top} className="w-2! h-2! bg-slate-400!" />

      <span className="text-xs font-semibold text-slate-700 text-center px-2 leading-tight max-w-full break-words">
        {data.label}
      </span>

      {data.reward != null && (
        <span className="text-[10px] text-slate-500 mt-0.5">R={data.reward}</span>
      )}

      {hasValue && (
        <span className="text-[11px] font-bold text-blue-600 mt-1 whitespace-nowrap px-1">
          V = {data.computedValue.toFixed(2)}
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2! h-2! bg-slate-400!" />
    </div>
  )
}
