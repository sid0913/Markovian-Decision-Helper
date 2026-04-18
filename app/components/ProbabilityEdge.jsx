'use client'

import { BaseEdge, EdgeLabelRenderer, getStraightPath, getBezierPath } from '@xyflow/react'
import { useState } from 'react'

export default function ProbabilityEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
  markerEnd,
  style,
  selected,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState('')

  const isActionEdge = data?.sourceType === 'action'
  const prob = data?.probability

  function handleBlur() {
    setEditing(false)
    const parsed = parseFloat(localVal)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      data?.onProbabilityChange?.(id, parsed)
    }
  }

  const edgeStyle = {
    ...style,
    strokeWidth: selected ? 2.5 : 1.5,
    stroke: data?.isOptimal ? '#22c55e' : selected ? '#6366f1' : '#94a3b8',
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      {isActionEdge && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {editing ? (
              <input
                autoFocus
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={localVal}
                onChange={e => setLocalVal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={e => { if (e.key === 'Enter') handleBlur() }}
                className="w-16 text-xs text-slate-900 text-center border border-blue-400 rounded px-1 py-0.5 bg-white shadow"
              />
            ) : (
              <button
                onClick={() => { setLocalVal(prob != null ? String(prob) : ''); setEditing(true) }}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  data?.isOptimal
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-slate-300 text-slate-600'
                } shadow-sm hover:bg-blue-50`}
              >
                {prob != null ? `P=${prob}` : 'P=?'}
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
