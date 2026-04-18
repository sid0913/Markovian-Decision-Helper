# Data Model: MDP Decision Tool

**Date:** 2026-04-17

---

## Entities

### 1. MdpNode

Represents either a **State** or an **Action** in the MDP graph.

```js
/**
 * @typedef {Object} MdpNode
 * @property {string}  id       - UUID, unique per graph
 * @property {'state'|'action'} type - Bipartite type
 * @property {string}  label    - User-provided display name
 * @property {number|null} reward  - Optional reward; REQUIRED on leaf state nodes for computation
 * @property {{ x: number, y: number }} position - Canvas coordinates (React Flow)
 * @property {number|null} computedValue - V(s) for states, Q(s,a) for actions; null until computed
 * @property {boolean} isOptimal - true if this action is the argmax child of its parent state
 */
```

**Invariants:**
- `type === 'state'` nodes may only have outgoing edges to `type === 'action'` nodes.
- `type === 'action'` nodes may only have outgoing edges to `type === 'state'` nodes.
- A **leaf state** is a state node with zero outgoing edges.
- Leaf state nodes MUST have `reward !== null` before `computeValues()` is called.

---

### 2. MdpEdge

Represents a directed edge in the MDP graph.

```js
/**
 * @typedef {Object} MdpEdge
 * @property {string} id        - UUID
 * @property {string} source    - Source MdpNode id
 * @property {string} target    - Target MdpNode id
 * @property {number|null} probability
 *   - Only meaningful when source is 'action' type.
 *   - For state→action edges: null (probability not applicable).
 *   - For action→state edges: value in (0, 1]; all action→state edges from
 *     the same action node MUST sum to 1.0 (±0.001 tolerance).
 */
```

**Invariants:**
- An edge from a state node to another state node is invalid.
- An edge from an action node to another action node is invalid.
- Adding an edge that creates a cycle MUST be rejected.

---

### 3. MdpGraph (runtime state)

The top-level container managed in React component state.

```js
/**
 * @typedef {Object} MdpGraph
 * @property {MdpNode[]} nodes
 * @property {MdpEdge[]} edges
 * @property {string|null} lastComputedAt  - ISO timestamp of last successful compute
 * @property {ValidationResult|null} validationError
 */
```

---

### 4. ValidationResult

Produced by the validation layer before computation.

```js
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {ValidationError[]} errors
 */

/**
 * @typedef {Object} ValidationError
 * @property {'missing_leaf_reward'|'cycle_detected'|'invalid_edge_type'|'probability_sum'} code
 * @property {string} message   - Human-readable message
 * @property {string[]} nodeIds - IDs of offending nodes/edges
 */
```

---

### 5. Persistence (localStorage)

The entire `MdpGraph` is serialized as JSON to `localStorage` under the key
`mdp_graph_v1`. The `computedValue` and `isOptimal` fields are NOT persisted
(they are recomputed on load). `lastComputedAt` and `validationError` are also
cleared on reload.

---

## State Transitions

```
IDLE
  ├─ addNode()         → IDLE (node appended, computedValues cleared)
  ├─ addEdge(e)        → validate:
  │     ├─ cycle? → VALIDATION_ERROR (edge rejected, not added)
  │     ├─ type mismatch? → VALIDATION_ERROR
  │     └─ ok → IDLE
  ├─ updateNodeLabel() → IDLE
  ├─ updateReward()    → IDLE (computedValues cleared)
  ├─ updateProbability()→ IDLE
  ├─ compute()         → validate all:
  │     ├─ errors? → VALIDATION_ERROR (displayed to user)
  │     └─ ok → COMPUTED (computedValues set on all nodes)
  └─ reset()           → IDLE (graph cleared)

COMPUTED
  ├─ any mutation      → IDLE (computedValues cleared, user must recompute)
  └─ compute()         → COMPUTED (recomputed)

VALIDATION_ERROR
  └─ fix + compute()   → COMPUTED or VALIDATION_ERROR
```

---

## Computation Algorithm (pseudocode)

```
function computeValues(nodes, edges):
  adj = buildAdjacency(nodes, edges)   // node_id → [edge]
  order = topologicalSort(nodes, adj)  // Kahn's algorithm; guaranteed acyclic

  V = {}   // state value map: node_id → number
  Q = {}   // action value map: node_id → number

  for node in reversed(order):
    if node.type === 'state':
      children = outgoing action edges of node
      if children.length === 0:          // leaf state
        V[node.id] = node.reward          // reward MUST be non-null (pre-validated)
      else:
        qvals = [Q[a.id] for a in children]
        V[node.id] = node.reward + max(qvals)
        mark argmax child as isOptimal = true

    if node.type === 'action':
      children = outgoing state edges of node  // action → state edges
      expected = Σ edge.probability * V[edge.target]
      Q[node.id] = (node.reward ?? 0) + expected

  return { V, Q }
```

---

## 6. ChatMessage

Represents one turn in the AI chat conversation.

```js
/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'} role
 * @property {string} content  - Raw text displayed in the chat UI
 * @property {GraphOperation[]} [operations]
 *   - Present on assistant messages only.
 *   - Operations that were applied to the graph as a result of this turn.
 * @property {string} timestamp  - ISO string
 */
```

---

## 7. GraphOperation

An atomic instruction the AI issues to modify the graph. Applied in order.

```js
/**
 * @typedef {Object} GraphOperation
 * @property {'clear_graph'|'add_node'|'add_edge'|'set_reward'|'set_probability'|'compute'} op
 *
 * For op === 'add_node':
 * @property {'state'|'action'} type
 * @property {string} label        - Human-readable name; must be unique within the graph
 * @property {number} [reward]     - Optional initial reward
 *
 * For op === 'add_edge':
 * @property {string} source       - Label of source node
 * @property {string} target       - Label of target node
 * @property {number} [probability] - Only for action→state edges
 *
 * For op === 'set_reward':
 * @property {string} label        - Node label to update
 * @property {number} reward
 *
 * For op === 'set_probability':
 * @property {string} source       - Action node label
 * @property {string} target       - State node label
 * @property {number} probability
 *
 * For op === 'clear_graph':  (no additional fields)
 * For op === 'compute':      (no additional fields; triggers computeValues)
 */
```

**Invariants:**
- `add_node` MUST use a label not already present in the current graph.
  If duplicate, the operation is skipped (no error thrown).
- `add_edge` uses labels to resolve node IDs; if either label is not found,
  the operation is skipped with a warning logged.
- Operations referencing unknown labels do not abort the batch — remaining
  operations in the array continue to execute.
- `clear_graph` removes all nodes and edges before subsequent operations
  in the same array execute.

---

## 8. AI Request/Response (Route Handler shape)

```js
/**
 * POST /api/chat
 *
 * @typedef {Object} ChatRequest
 * @property {ChatMessage[]} messages     - Full conversation history (user + assistant)
 * @property {{ nodes: MdpNode[], edges: MdpEdge[] }} graph  - Current graph snapshot
 * @property {'minimax'|'claude'} model   - Which AI backend to use
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string}           reply      - Plain-text message shown in chat UI
 * @property {GraphOperation[]} operations - Ordered list of graph mutations to apply
 * @property {'minimax'|'claude'} model    - Echo of which model was used
 */
```

---

## Validation Rules (exhaustive)

| Rule ID | When checked | Description |
|---|---|---|
| V1 | On edge add | Source and target types must alternate (state→action or action→state) |
| V2 | On edge add | Adding edge must not create a cycle (DFS cycle check) |
| V3 | On compute | Every leaf state node must have `reward !== null` |
| V4 | On compute (warn) | All action→state edges from same action must sum to 1 (±0.001) |
| V5 | On compute (warn) | Action→state edge probability must be in (0, 1] |
