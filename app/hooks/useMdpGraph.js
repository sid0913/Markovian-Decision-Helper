'use client'

import { useReducer, useEffect, useRef } from 'react'
import { validateGraph, computeValues, wouldCreateCycle } from '@/lib/mdp'
import { saveGraph, loadGraph } from '@/lib/storage'
import { autoLayout } from '@/lib/layout'
import { EXAMPLES } from '@/lib/examples'

let nodeCounter = 0
let edgeCounter = 0

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const initialState = {
  nodes: [],
  edges: [],
  computedStatus: 'idle', // 'idle' | 'computed' | 'error'
  validationResult: null,
}

function clearComputed(nodes, edges) {
  return {
    nodes: nodes.map(n => ({ ...n, computedValue: null, isOptimal: false })),
    edges: edges.map(e => ({ ...e, isOptimal: false })),
  }
}

function graphReducer(state, action) {
  switch (action.type) {
    case 'ADD_NODE': {
      const { nodeType, label, position } = action.payload
      const newNode = {
        id: uid('node'),
        type: nodeType,
        label,
        reward: null,
        computedValue: null,
        isOptimal: false,
        position: position ?? { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      }
      const { nodes, edges } = clearComputed([...state.nodes, newNode], state.edges)
      return { ...state, nodes, edges, computedStatus: 'idle', validationResult: null }
    }

    case 'DELETE_NODE': {
      const { id } = action.payload
      const nodes = state.nodes.filter(n => n.id !== id)
      const edges = state.edges.filter(e => e.source !== id && e.target !== id)
      const cleared = clearComputed(nodes, edges)
      return { ...state, ...cleared, computedStatus: 'idle', validationResult: null }
    }

    case 'UPDATE_NODE': {
      const { id, patch } = action.payload
      const nodes = state.nodes.map(n => n.id === id ? { ...n, ...patch } : n)
      const cleared = clearComputed(nodes, state.edges)
      return { ...state, ...cleared, computedStatus: 'idle', validationResult: null }
    }

    case 'ADD_EDGE': {
      const { source, target } = action.payload
      const sourceNode = state.nodes.find(n => n.id === source)
      const targetNode = state.nodes.find(n => n.id === target)
      if (!sourceNode || !targetNode) return state
      // Type constraint
      if (sourceNode.type === targetNode.type) return state
      // Cycle check
      if (wouldCreateCycle(state.nodes, state.edges, { source, target })) return state
      const newEdge = {
        id: uid('edge'),
        source,
        target,
        probability: sourceNode.type === 'action' ? null : null,
        isOptimal: false,
        type: 'probability',
      }
      const { nodes, edges } = clearComputed(state.nodes, [...state.edges, newEdge])
      return { ...state, nodes, edges, computedStatus: 'idle', validationResult: null }
    }

    case 'DELETE_EDGE': {
      const edges = state.edges.filter(e => e.id !== action.payload.id)
      const cleared = clearComputed(state.nodes, edges)
      return { ...state, ...cleared, computedStatus: 'idle', validationResult: null }
    }

    case 'UPDATE_EDGE': {
      const { id, patch } = action.payload
      const edges = state.edges.map(e => e.id === id ? { ...e, ...patch } : e)
      const cleared = clearComputed(state.nodes, edges)
      return { ...state, ...cleared, computedStatus: 'idle', validationResult: null }
    }

    case 'COMPUTE': {
      const result = validateGraph(state.nodes, state.edges)
      if (!result.valid) {
        return { ...state, computedStatus: 'error', validationResult: result }
      }
      try {
        const { nodes, edges } = computeValues(state.nodes, state.edges)
        return { ...state, nodes, edges, computedStatus: 'computed', validationResult: result }
      } catch (err) {
        return {
          ...state,
          computedStatus: 'error',
          validationResult: {
            valid: false,
            errors: [{ code: 'compute_error', message: err.message, nodeIds: [] }],
          },
        }
      }
    }

    case 'RESET': {
      saveGraph({ nodes: [], edges: [] })
      return { ...initialState }
    }

    case 'LOAD': {
      const { nodes, edges } = action.payload
      return {
        ...initialState,
        nodes: nodes.map(n => ({ ...n, computedValue: null, isOptimal: false })),
        edges: edges.map(e => ({ ...e, isOptimal: false })),
      }
    }

    default:
      return state
  }
}

export function useMdpGraph() {
  const [state, dispatch] = useReducer(graphReducer, initialState)
  const saveTimer = useRef(null)

  // Load from localStorage on mount; show default example for first-time visitors
  useEffect(() => {
    const saved = loadGraph()
    if (saved) {
      dispatch({ type: 'LOAD', payload: saved })
    } else {
      const ex = EXAMPLES[0]
      const laid = autoLayout(ex.nodes, ex.edges)
      dispatch({ type: 'LOAD', payload: { nodes: laid, edges: ex.edges } })
      setTimeout(() => dispatch({ type: 'COMPUTE' }), 80)
    }
  }, [])

  // Auto-save (debounced 500ms)
  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveGraph({ nodes: state.nodes, edges: state.edges })
    }, 500)
    return () => clearTimeout(saveTimer.current)
  }, [state.nodes, state.edges])

  return {
    nodes: state.nodes,
    edges: state.edges,
    computedStatus: state.computedStatus,
    validationResult: state.validationResult,

    addNode: (nodeType, label, position) =>
      dispatch({ type: 'ADD_NODE', payload: { nodeType, label, position } }),
    deleteNode: id => dispatch({ type: 'DELETE_NODE', payload: { id } }),
    updateNode: (id, patch) => dispatch({ type: 'UPDATE_NODE', payload: { id, patch } }),

    addEdge: (source, target) => dispatch({ type: 'ADD_EDGE', payload: { source, target } }),
    deleteEdge: id => dispatch({ type: 'DELETE_EDGE', payload: { id } }),
    updateEdge: (id, patch) => dispatch({ type: 'UPDATE_EDGE', payload: { id, patch } }),

    compute: () => dispatch({ type: 'COMPUTE' }),
    reset: () => dispatch({ type: 'RESET' }),
    loadGraph: payload => dispatch({ type: 'LOAD', payload }),
  }
}
