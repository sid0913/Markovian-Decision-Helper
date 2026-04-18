'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import StateNode from './StateNode'
import ActionNode from './ActionNode'
import ProbabilityEdge from './ProbabilityEdge'

const nodeTypes = { state: StateNode, action: ActionNode }
const edgeTypes = { probability: ProbabilityEdge }

// Mounted inside ReactFlow so useReactFlow() works here
function FitViewPanel({ trigger }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    if (trigger > 0) {
      // Small delay lets React commit the new positions before fitView runs
      const id = setTimeout(() => fitView({ padding: 0.18, duration: 400 }), 30)
      return () => clearTimeout(id)
    }
  }, [trigger, fitView])
  return null
}

export default function GraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onEdgeSelect,
  onEdgeDelete,
  onNodeDelete,
  onProbabilityChange,
  fitViewTrigger,
}) {
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleConnect = useCallback((connection) => {
    const result = onConnect(connection)
    if (result?.error) showToast(result.error)
  }, [onConnect])

  const rfNodes = nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position ?? { x: 200, y: 200 },
    data: {
      label: n.label,
      reward: n.reward,
      computedValue: n.computedValue,
      isOptimal: n.type === 'action' ? n.isOptimal : false,
      isRoot: !edges.some(e => e.target === n.id) && n.type === 'state',
    },
    selected: n.selected,
  }))

  const rfEdges = edges.map(e => {
    const sourceNode = nodes.find(n => n.id === e.source)
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'probability',
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      data: {
        sourceType: sourceNode?.type,
        probability: e.probability,
        isOptimal: e.isOptimal,
        onProbabilityChange,
      },
      selected: e.selected,
    }
  })

  const isEmpty = nodes.length === 0

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => onNodeSelect?.(node.id)}
        onEdgeClick={(_, edge) => onEdgeSelect?.(edge.id)}
        onNodeDoubleClick={(_, node) => onNodeSelect?.(node.id)}
        onEdgesDelete={edgeList => edgeList.forEach(e => onEdgeDelete?.(e.id))}
        onNodesDelete={nodeList => nodeList.forEach(n => onNodeDelete?.(n.id))}
        onPaneClick={() => { onNodeSelect?.(null); onEdgeSelect?.(null) }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode="Delete"
      >
        <Background variant="dots" gap={16} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap nodeColor={n => n.type === 'state' ? '#bfdbfe' : '#d8b4fe'} />
        <FitViewPanel trigger={fitViewTrigger ?? 0} />
      </ReactFlow>

      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-slate-400 max-w-xs">
            <div className="text-4xl mb-3">⬡</div>
            <p className="text-sm font-medium">Add a State or Action from the sidebar</p>
            <p className="text-xs mt-1">or open the AI Chat to describe your decision</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
