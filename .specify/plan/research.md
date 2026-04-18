# Research: MDP Decision Tool

**Date:** 2026-04-17
**Feature:** Interactive MDP graph builder with expected-reward computation

---

## 1. MDP Theory — Core Findings

### Decision: Model as finite, acyclic MDP (DAG-MDP)

A classical MDP is defined by the tuple **(S, A, T, R)**:

| Symbol | Meaning |
|---|---|
| S | Finite set of **states** |
| A | Finite set of **actions** |
| T(s, a, s') | Transition probability P(s' \| s, a) |
| R(s), R(a) | Reward associated with a state or action |

This project uses a **finite-horizon, acyclic variant** (DAG-MDP):
- No state can be revisited — the graph is a strict DAG.
- The user defines the graph manually (no environment simulation).
- The graph is bipartite: edges must alternate **State → Action → State**.

**Rationale:** Acyclic MDPs are solvable in O(|V| + |E|) by backward induction
(topological-sort DP), making them ideal for interactive, real-time computation on
a client-side web app with no backend.

---

### Value Functions

**Leaf states** (no outgoing action edges):
```
V(s_leaf) = R(s_leaf)
```

**Action nodes** (Q-value):
```
Q(s, a) = R(a) + Σ_{s'} P(s' | a) · V(s')
```
where the sum is over all states s' reachable from action a, and probabilities
on those edges MUST sum to 1.

**Non-leaf state nodes**:
```
V(s) = R(s) + max_a  Q(s, a)
```
`max_a` selects the optimal action — this is what the tool surfaces to the user
as the recommended decision at each state.

**Root node:** V(root) gives the overall expected value of the decision tree.
The action child of the root with the highest Q-value is the recommended choice.

---

### DAG Enforcement

A directed cycle in the graph would make backward induction undefined.
Cycle detection MUST run after every edge addition using **DFS-based cycle check**:
- Maintain visited and recursion-stack sets.
- If a node is reached that is already in the recursion stack → cycle detected → reject edge.

Additionally, the bipartite constraint (State→Action→State) must be checked: an edge
from State directly to State, or Action directly to Action, MUST be rejected.

---

### Leaf Node Reward Validation

Before computing expected rewards, every **leaf state** (state with no outgoing action
edges) MUST have a reward value set. This is validated on-demand when the user clicks
"Compute". Missing rewards produce a validation error that identifies the specific node.

---

## 2. UI Library — React Flow

**Decision:** Use `@xyflow/react` (React Flow v12+)

| Alternative | Why rejected |
|---|---|
| D3.js manual | Too low-level; drag-and-drop and edge routing require significant custom code |
| vis.js | Less React-idiomatic; smaller ecosystem |
| Cytoscape.js | Good graphs but worse React integration |

React Flow provides:
- Built-in drag-and-drop node positioning
- Custom node and edge components (needed for state vs. action visual distinction)
- `onConnect` callback for edge creation (where we run DAG validation)
- `useNodesState` / `useEdgesState` hooks compatible with React App Router client components

**Layout:** Free-form (user positions nodes manually). Auto-layout via `dagre` available
as an optional "Auto-arrange" button using `@dagrejs/dagre`.

---

## 3. Computation Engine

**Decision:** Pure client-side JavaScript module, no backend.

Algorithm: **Topological sort → backward induction**

```
1. Build adjacency list from edges.
2. Topological sort (Kahn's algorithm on the DAG).
3. Process nodes in reverse topological order (leaves first):
   - Leaf state: V[s] = reward[s]
   - Action node: Q[a] = reward[a] + Σ P(edge) * V[target]
   - Non-leaf state: V[s] = reward[s] + max(Q[a] for a in children(s))
4. Annotate each node with its computed V or Q value.
5. Mark the optimal action at each state (argmax child Q).
```

Edge case: if any leaf state has no reward → abort with list of offending node IDs.
Edge case: if action edges don't sum to 1 → warn but don't block (user may still be building).

---

## 4. Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router, JS | Constitution requirement |
| Graph canvas | `@xyflow/react` | Best React-native drag-and-drop graph lib |
| Auto-layout | `@dagrejs/dagre` | Pairs naturally with React Flow |
| State management | React `useState` + `useReducer` | No global state lib needed at this scale |
| Styling | Tailwind CSS | Utility-first, minimal bundle for small site |
| Persistence | `localStorage` JSON | No backend; 100 users, no auth needed |
| Testing | Jest + React Testing Library | Constitution requirement |
| Deployment | Netlify static export | Constitution requirement; all computation is client-side |

---

## 6. AI Chat Layer — Findings

### Decision: Unified JSON-in-content strategy for both models

Both Minimax and Claude will be instructed via system prompt to respond with a
**structured JSON object** on every turn:

```json
{
  "message": "Human-readable explanation",
  "operations": [
    { "op": "clear_graph" },
    { "op": "add_node", "type": "state", "label": "Start", "reward": 0 },
    { "op": "add_node", "type": "action", "label": "Invest" },
    { "op": "add_node", "type": "state", "label": "Win", "reward": 100 },
    { "op": "add_edge", "source": "Start", "target": "Invest" },
    { "op": "add_edge", "source": "Invest", "target": "Win", "probability": 0.7 },
    { "op": "set_reward", "label": "Win", "reward": 100 },
    { "op": "set_probability", "source": "Invest", "target": "Win", "probability": 0.7 },
    { "op": "compute" }
  ]
}
```

**Why not native tool calling?**
- Minimax's `M2-her` endpoint documentation does not explicitly confirm tool calling
  support in the production API. JSON-in-content is simpler, consistent, and equally
  capable for this use case.
- Claude's native tool use could be used, but keeping a single parsing strategy across
  both models reduces code surface area (Principle 1 — Minimal Footprint).

**Fallback:** If the AI returns malformed JSON, the Route Handler catches the parse
error and returns `{ reply: "<error message>", operations: [] }`. The graph is not
modified.

### Minimax API

| Property | Value |
|---|---|
| Base URL | `https://api.minimax.io` |
| Endpoint | `POST /v1/text/chatcompletion_v2` |
| Auth | `Authorization: Bearer <MINIMAX_KEY>` |
| Model | `MiniMax-Text-01` (or `M2-her` per docs) |
| Format | OpenAI-compatible messages array |

### Claude API

| Property | Value |
|---|---|
| SDK | `@anthropic-ai/sdk` |
| Model | `claude-sonnet-4-6` |
| Auth | `ANTHROPIC_KEY` env var (read server-side) |
| Format | `anthropic.messages.create({ model, system, messages, max_tokens })` |

### Route Handler: `app/api/chat/route.js`

A Next.js App Router Route Handler. Reads API keys from `process.env` server-side
(never exposed to client). Compatible with Netlify's serverless function execution
(Principle 4). Request/response:

```
POST /api/chat
Body: { messages: ChatMessage[], graph: SerializedGraph, model: 'minimax'|'claude' }
Response: { reply: string, operations: GraphOperation[] }
```

### Security

- API keys MUST be set in Netlify environment variable UI (not `.env` committed to git;
  `.env` is gitignored).
- The Route Handler only reads `process.env.MINIMAX_KEY` and `process.env.ANTHROPIC_KEY`.
- No user data is stored server-side (stateless serverless function).

---

## 5. Open Questions — Resolved

| Question | Resolution |
|---|---|
| Discount factor γ? | Not used — finite acyclic tree, no need to discount |
| Cyclic MDPs? | Out of scope by user requirement (DAG only) |
| Multi-agent? | Out of scope — single decision-maker |
| Server-side computation? | Not needed — pure client JS is sufficient for ~100 users |
| Persistence across sessions? | localStorage; no account system |
| Multiple root nodes? | Treat each connected component separately; compute V for each root |
| Which AI model is default? | Minimax (`M2-her`); Claude as opt-in toggle |
| Where do API keys live at runtime? | Netlify env var UI; read server-side only in Route Handler |
| Can the AI overwrite the graph? | Yes — `clear_graph` op is allowed; user can undo via Reset |
| Streaming responses? | Not in v1; full response then apply operations |
