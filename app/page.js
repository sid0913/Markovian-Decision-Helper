'use client'

import { useState, useCallback } from 'react'
import { useMdpGraph } from './hooks/useMdpGraph'
import GraphCanvas from './components/GraphCanvas'
import AddNodePanel from './components/AddNodePanel'
import NodeSidebar from './components/NodeSidebar'
import EdgeSidebar from './components/EdgeSidebar'
import ValidationBanner from './components/ValidationBanner'
import ChatPanel from './components/ChatPanel'
import { wouldCreateCycle } from '@/lib/mdp'
import { applyOperations } from '@/lib/ai/applyOperations'
import { autoLayout } from '@/lib/layout'

export default function Home() {
  const graph = useMdpGraph()
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [fitViewTrigger, setFitViewTrigger] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedNode = graph.nodes.find(n => n.id === selectedNodeId) ?? null
  const selectedEdge = graph.edges.find(e => e.id === selectedEdgeId) ?? null

  function handleNodesChange(changes) {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        graph.updateNode(change.id, { position: change.position })
      }
      if (change.type === 'remove') {
        graph.deleteNode(change.id)
      }
    }
  }

  function handleEdgesChange(changes) {
    for (const change of changes) {
      if (change.type === 'remove') {
        graph.deleteEdge(change.id)
      }
    }
  }

  const handleConnect = useCallback((connection) => {
    const src = graph.nodes.find(n => n.id === connection.source)
    const tgt = graph.nodes.find(n => n.id === connection.target)
    if (!src || !tgt) return { error: 'Unknown node.' }
    if (src.type === tgt.type) {
      return { error: `Cannot connect ${src.type} → ${tgt.type}. States connect to actions and vice versa.` }
    }
    if (wouldCreateCycle(graph.nodes, graph.edges, { source: connection.source, target: connection.target })) {
      return { error: 'This edge would create a cycle. MDP graphs must be acyclic.' }
    }
    graph.addEdge(connection.source, connection.target)
    return {}
  }, [graph.nodes, graph.edges, graph.addEdge])

  function handleProbabilityChange(edgeId, value) {
    graph.updateEdge(edgeId, { probability: value })
  }

  function handleAutoLayout() {
    if (graph.nodes.length === 0) return
    const arranged = autoLayout(graph.nodes, graph.edges)
    graph.loadGraph({ nodes: arranged, edges: graph.edges })
    setFitViewTrigger(v => v + 1)
  }

  function handleChatOperations(ops) {
    const shouldCompute = ops.some(o => o.op === 'compute')
    const opsWithoutCompute = ops.filter(o => o.op !== 'compute')
    const updated = applyOperations(
      { nodes: graph.nodes, edges: graph.edges },
      opsWithoutCompute
    )
    const prettified = { nodes: autoLayout(updated.nodes, updated.edges), edges: updated.edges }
    graph.loadGraph(prettified)
    setFitViewTrigger(v => v + 1)
    if (shouldCompute) {
      setTimeout(() => graph.compute(), 80)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect y="2" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect y="7.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect y="12.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>
          <h1 className="text-sm font-bold text-slate-800">MDP Decision Tool</h1>
          <span className="text-xs text-slate-400 hidden sm:block">
            Model your decisions as Markov processes
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAutoLayout}
            disabled={graph.nodes.length === 0}
            title="Reorganise graph into a clean, spaced layout"
            className="text-xs px-2.5 py-1.5 border border-violet-300 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed text-violet-700 font-medium rounded-md transition-colors flex items-center gap-1"
          >
            <span>✦</span><span className="hidden sm:inline">Prettify</span>
          </button>
          <button
            onClick={graph.compute}
            className="text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          >
            Compute
          </button>
          <button
            onClick={graph.reset}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors hidden sm:block"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left sidebar — always visible on md+, slide-in overlay on mobile */}
        <aside className={`
          ${sidebarOpen ? 'flex' : 'hidden'} md:flex
          fixed md:relative inset-y-0 left-0 z-40 md:z-auto
          w-64 md:w-56 bg-white border-r border-slate-200 flex-col overflow-y-auto shrink-0
          shadow-xl md:shadow-none
        `}>
          {/* Mobile close button */}
          <div className="md:hidden flex justify-end px-3 pt-3">
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          <AddNodePanel
            onAdd={(type, label, pos) => { graph.addNode(type, label, pos); setSidebarOpen(false) }}
            nodeCount={graph.nodes.length}
          />
          {selectedNode && (
            <NodeSidebar
              node={selectedNode}
              onChange={patch => graph.updateNode(selectedNodeId, patch)}
              onDelete={() => { graph.deleteNode(selectedNodeId); setSelectedNodeId(null) }}
            />
          )}
          {selectedEdge && !selectedNode && (
            <EdgeSidebar
              edge={selectedEdge}
              nodes={graph.nodes}
              onChange={patch => graph.updateEdge(selectedEdgeId, patch)}
              onDelete={() => { graph.deleteEdge(selectedEdgeId); setSelectedEdgeId(null) }}
            />
          )}

          {!selectedNode && !selectedEdge && (
            <div className="p-3 text-[11px] text-slate-400 space-y-1.5 mt-2">
              <p><span className="font-medium text-slate-500">Connect:</span> Drag from node handle</p>
              <p><span className="font-medium text-slate-500">Select:</span> Click a node or edge</p>
              <p><span className="font-medium text-slate-500">Delete:</span> Select + Delete key</p>
              <p><span className="font-medium text-slate-500">Probabilities:</span> Click P=? on edges</p>
            </div>
          )}
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeSelect={id => { setSelectedNodeId(id); setSelectedEdgeId(null) }}
            onEdgeSelect={id => { setSelectedEdgeId(id); setSelectedNodeId(null) }}
            onNodeDelete={graph.deleteNode}
            onEdgeDelete={graph.deleteEdge}
            onProbabilityChange={handleProbabilityChange}
            fitViewTrigger={fitViewTrigger}
          />
        </main>
      </div>

      {/* Validation banner */}
      <ValidationBanner
        status={graph.computedStatus}
        result={graph.validationResult}
      />

      {/* Chat panel — bottom-centre dock, self-manages open/close */}
      <ChatPanel
        graph={{ nodes: graph.nodes, edges: graph.edges }}
        onOperations={handleChatOperations}
      />
    </div>
  )
}
