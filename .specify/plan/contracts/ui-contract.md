# UI Contract: MDP Decision Tool

**Date:** 2026-04-17

This document defines the component interface contracts — props, callbacks, and
invariants — for the key UI components. These are the "API surface" between
components, equivalent to what an HTTP API contract is for a web service.

---

## Page: `/` (Home / App)

The single page of the application. Renders the full MDP editor.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Header: "MDP Decision Tool"   [Compute] [Reset]    │
├──────────────┬──────────────────────────────────────┤
│   Sidebar    │   Graph Canvas (React Flow)           │
│  (node add   │                                       │
│   + props)   │   Drag-and-drop nodes + edges         │
│              │                                       │
└──────────────┴──────────────────────────────────────┘
│  Validation / result banner (bottom)                │
└─────────────────────────────────────────────────────┘
```

---

## Component: `GraphCanvas`

Wraps `@xyflow/react`. Renders nodes and edges; handles connection events.

```js
/**
 * @param {Object} props
 * @param {MdpNode[]}  props.nodes          - Current node list
 * @param {MdpEdge[]}  props.edges          - Current edge list
 * @param {function(MdpNode): void}  props.onNodeChange     - Node position/label update
 * @param {function(MdpEdge): void}  props.onConnect        - New edge connection attempt
 * @param {function(string): void}   props.onNodeSelect     - Node selected (opens sidebar)
 * @param {function(string): void}   props.onNodeDelete     - Node deleted
 * @param {function(string): void}   props.onEdgeDelete     - Edge deleted
 */
```

**Behaviour contract:**
- MUST call `onConnect` with the prospective edge before it is added to state.
  The parent validates (cycle + type check) and rejects by not adding the edge.
- MUST render state nodes as **circles** and action nodes as **diamonds/rectangles**.
- Computed `V(s)` and `Q(s,a)` values MUST be displayed inside the node bubble
  when `node.computedValue !== null`.
- The optimal-action edge MUST be rendered with a distinct highlight colour (e.g., green).

---

## Component: `NodeSidebar`

Properties panel shown when a node is selected.

```js
/**
 * @param {MdpNode|null}  props.node              - Selected node or null
 * @param {function(Partial<MdpNode>): void} props.onChange  - Field update callback
 */
```

**Fields rendered:**
| Field | Input type | Condition |
|---|---|---|
| Label | text | always |
| Reward | number | always (optional unless leaf state) |
| Type | read-only badge | always (cannot change type post-creation) |
| Computed value | read-only display | when `node.computedValue !== null` |

---

## Component: `EdgeSidebar` (inline on edge click)

```js
/**
 * @param {MdpEdge|null}  props.edge
 * @param {function(Partial<MdpEdge>): void} props.onChange
 */
```

**Fields rendered:**
| Field | Input type | Condition |
|---|---|---|
| Probability | number [0–1] | only when `source.type === 'action'` |

---

## Component: `AddNodePanel`

Sidebar section for adding new nodes.

```js
/**
 * @param {function('state'|'action', string): void} props.onAdd
 *   Called with (type, label) when user submits the add form.
 */
```

**Behaviour:**
- Default label: "State N" or "Action N" based on type and current count.
- Node is placed at a default canvas position (center + small random offset).

---

## Component: `ValidationBanner`

Displays errors and warnings at the bottom of the screen.

```js
/**
 * @param {ValidationResult|null} props.result
 * @param {'idle'|'computed'|'error'} props.status
 */
```

**States:**
| Status | Display |
|---|---|
| `idle` | Hidden |
| `computed` | Green bar: "Expected values computed. Optimal path highlighted." |
| `error` | Red bar listing each `ValidationError.message` with node labels |

---

## Computation Module: `lib/mdp.js` (pure functions, no React)

```js
/**
 * Check if adding an edge would create a cycle.
 * @param {MdpNode[]} nodes
 * @param {MdpEdge[]} edges
 * @param {{ source: string, target: string }} newEdge
 * @returns {boolean} true if cycle detected
 */
export function wouldCreateCycle(nodes, edges, newEdge) {}

/**
 * Validate graph before computation.
 * @param {MdpNode[]} nodes
 * @param {MdpEdge[]} edges
 * @returns {ValidationResult}
 */
export function validateGraph(nodes, edges) {}

/**
 * Run backward induction on a validated DAG-MDP.
 * @param {MdpNode[]} nodes
 * @param {MdpEdge[]} edges
 * @returns {{ nodes: MdpNode[], edges: MdpEdge[] }}
 *   Returns new arrays with computedValue and isOptimal fields set.
 */
export function computeValues(nodes, edges) {}

/**
 * Topological sort (Kahn's algorithm).
 * @param {MdpNode[]} nodes
 * @param {MdpEdge[]} edges
 * @returns {string[]} node IDs in topological order
 */
export function topologicalSort(nodes, edges) {}
```

---

## Persistence Contract: `lib/storage.js`

```js
/**
 * Save graph to localStorage.
 * @param {{ nodes: MdpNode[], edges: MdpEdge[] }} graph
 */
export function saveGraph(graph) {}

/**
 * Load graph from localStorage. Returns null if nothing saved.
 * @returns {{ nodes: MdpNode[], edges: MdpEdge[] } | null}
 */
export function loadGraph() {}
```

Key: `mdp_graph_v1`
Format: JSON. `computedValue` and `isOptimal` are stripped before save.
