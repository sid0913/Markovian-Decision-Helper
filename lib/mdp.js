/**
 * Pure MDP computation engine — no React dependencies.
 * Implements topological sort, cycle detection, graph validation,
 * and backward induction for finite acyclic MDPs.
 */

/**
 * Topological sort using Kahn's algorithm.
 * @param {Array<{id:string}>} nodes
 * @param {Array<{source:string,target:string}>} edges
 * @returns {string[]} Node IDs in topological order
 * @throws {Error} if a cycle is detected
 */
export function topologicalSort(nodes, edges) {
  const inDegree = {}
  const adj = {}

  for (const n of nodes) {
    inDegree[n.id] = 0
    adj[n.id] = []
  }
  for (const e of edges) {
    adj[e.source].push(e.target)
    inDegree[e.target] = (inDegree[e.target] ?? 0) + 1
  }

  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id)
  const order = []

  while (queue.length > 0) {
    const curr = queue.shift()
    order.push(curr)
    for (const neighbour of adj[curr]) {
      inDegree[neighbour]--
      if (inDegree[neighbour] === 0) queue.push(neighbour)
    }
  }

  if (order.length !== nodes.length) {
    throw new Error('Cycle detected in graph — topological sort failed')
  }
  return order
}

/**
 * Check whether adding newEdge would create a cycle.
 * @param {Array<{id:string}>} nodes
 * @param {Array<{source:string,target:string}>} edges
 * @param {{source:string,target:string}} newEdge
 * @returns {boolean}
 */
export function wouldCreateCycle(nodes, edges, newEdge) {
  const adj = {}
  for (const n of nodes) adj[n.id] = []
  for (const e of edges) adj[e.source].push(e.target)
  adj[newEdge.source].push(newEdge.target)

  // DFS to detect cycle reachable from newEdge.target back to newEdge.source
  const visited = new Set()
  const stack = [newEdge.target]
  while (stack.length > 0) {
    const curr = stack.pop()
    if (curr === newEdge.source) return true
    if (visited.has(curr)) continue
    visited.add(curr)
    for (const next of (adj[curr] ?? [])) stack.push(next)
  }
  return false
}

/**
 * Validate graph before computation.
 * Rules:
 *  V1 — edges must alternate state→action or action→state
 *  V2 — no cycles (checked via topologicalSort attempt)
 *  V3 — leaf state nodes must have a reward set
 *  V4 — (warning) action→state edge probabilities should sum to 1 per action
 * @param {Array<{id:string,type:string,reward:number|null}>} nodes
 * @param {Array<{id:string,source:string,target:string,probability:number|null}>} edges
 * @returns {{valid:boolean, errors:Array<{code:string,message:string,nodeIds:string[]}>}}
 */
export function validateGraph(nodes, edges) {
  const errors = []
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  // V1 — type alternation
  for (const e of edges) {
    const src = nodeMap[e.source]
    const tgt = nodeMap[e.target]
    if (!src || !tgt) continue
    if (src.type === tgt.type) {
      errors.push({
        code: 'invalid_edge_type',
        message: `Invalid edge: "${src.label}" (${src.type}) → "${tgt.label}" (${tgt.type}). States must connect to actions and vice versa.`,
        nodeIds: [e.source, e.target],
      })
    }
  }

  // V2 — no cycles
  try {
    topologicalSort(nodes, edges)
  } catch {
    errors.push({
      code: 'cycle_detected',
      message: 'The graph contains a cycle. MDP graphs must be acyclic (DAG).',
      nodeIds: [],
    })
  }

  // V3 — leaf states need rewards
  const hasOutgoing = new Set(edges.map(e => e.source))
  for (const n of nodes) {
    if (n.type === 'state' && !hasOutgoing.has(n.id) && n.reward == null) {
      errors.push({
        code: 'missing_leaf_reward',
        message: `Leaf state "${n.label}" has no reward. All leaf states must have a reward before computing expected values.`,
        nodeIds: [n.id],
      })
    }
  }

  // V4 — probability sums (blocking error)
  const actionEdges = {}
  for (const e of edges) {
    const src = nodeMap[e.source]
    if (src?.type === 'action') {
      if (!actionEdges[e.source]) actionEdges[e.source] = []
      actionEdges[e.source].push(e)
    }
  }
  for (const [actionId, outEdges] of Object.entries(actionEdges)) {
    const sum = outEdges.reduce((s, e) => s + (e.probability ?? 0), 0)
    if (Math.abs(sum - 1) > 0.001) {
      const action = nodeMap[actionId]
      errors.push({
        code: 'probability_sum',
        message: `Action "${action?.label}" probabilities sum to ${sum.toFixed(3)} (must equal 1.0).`,
        nodeIds: [actionId],
      })
    }
  }

  const blockingErrors = errors.filter(e => !e.warning)
  return { valid: blockingErrors.length === 0, errors }
}

/**
 * Run backward induction on a validated DAG-MDP.
 * @param {Array<{id:string,type:string,label:string,reward:number|null}>} nodes
 * @param {Array<{id:string,source:string,target:string,probability:number|null}>} edges
 * @returns {{nodes: Array, edges: Array}} New arrays with computedValue and isOptimal set
 */
export function computeValues(nodes, edges) {
  const order = topologicalSort(nodes, edges)
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, { ...n }]))

  // outgoing edges per node
  const outEdges = {}
  for (const n of nodes) outEdges[n.id] = []
  for (const e of edges) outEdges[e.source].push({ ...e })

  const V = {}  // state values
  const Q = {}  // action values

  // Process in reverse topological order (leaves first)
  for (const id of [...order].reverse()) {
    const node = nodeMap[id]
    const children = outEdges[id]

    if (node.type === 'state') {
      if (children.length === 0) {
        // Leaf state
        V[id] = node.reward ?? 0
      } else {
        // Compute Q for each child action, take max
        const qVals = children.map(e => Q[e.target] ?? 0)
        const maxQ = Math.max(...qVals)
        V[id] = (node.reward ?? 0) + maxQ

        // Mark optimal action
        const optimalIdx = qVals.indexOf(maxQ)
        children[optimalIdx].isOptimal = true
      }
    } else {
      // Action node: Q = reward + Σ P(s') * V(s')
      const expected = children.reduce((sum, e) => {
        return sum + (e.probability ?? 0) * (V[e.target] ?? 0)
      }, 0)
      Q[id] = (node.reward ?? 0) + expected
    }
  }

  // Annotate nodes with computed values
  const updatedNodes = nodes.map(n => ({
    ...n,
    computedValue: n.type === 'state' ? (V[n.id] ?? null) : (Q[n.id] ?? null),
    isOptimal: false,
  }))

  // Annotate edges with isOptimal
  const optimalEdgeIds = new Set()
  for (const id of order) {
    const node = nodeMap[id]
    if (node.type === 'state' && outEdges[id].length > 0) {
      const children = outEdges[id]
      const qVals = children.map(e => Q[e.target] ?? 0)
      const maxQ = Math.max(...qVals)
      const optIdx = qVals.indexOf(maxQ)
      optimalEdgeIds.add(children[optIdx].id)
    }
  }

  const updatedEdges = edges.map(e => ({
    ...e,
    isOptimal: optimalEdgeIds.has(e.id),
  }))

  return { nodes: updatedNodes, edges: updatedEdges }
}
