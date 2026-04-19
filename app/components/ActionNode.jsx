'use client'

import { Handle, Position } from '@xyflow/react'

export default function ActionNode({ data, selected }) {
  const hasValue = data.computedValue != null

  let borderClass = 'border-2 border-slate-300'
  if (selected) borderClass = 'border-2 border-purple-500'
  if (data.isOptimal) borderClass = 'border-2 border-green-500 shadow-green-200 shadow-md'

  let bgClass = 'bg-white'
  if (hasValue && data.isOptimal) bgClass = 'bg-green-50'
  else if (hasValue) bgClass = 'bg-slate-50'

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-36 h-20 rounded-lg ${bgClass} ${borderClass} cursor-pointer select-none shadow-sm`}
    >
      <Handle type="target" position={Position.Top} className="w-2! h-2! bg-slate-400!" />

      <span className="text-xs font-semibold text-slate-700 text-center px-2 leading-tight">
        {data.label}
      </span>

      {data.reward != null && (
        <span className="text-[10px] text-slate-500">R={data.reward}</span>
      )}

      {hasValue && (
        <span className={`text-[11px] font-bold mt-0.5 ${data.isOptimal ? 'text-green-600' : 'text-slate-500'}`}>
          Q={data.computedValue.toFixed(2)}
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2! h-2! bg-slate-400!" />
    </div>
  )
}
