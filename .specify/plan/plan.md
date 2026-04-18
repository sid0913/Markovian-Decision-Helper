# Implementation Plan: MDP Decision Tool

**Date:** 2026-04-17
**Constitution Version:** 1.0.0
**Branch:** `feat/mdp-tool`

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| P1 — Minimal Footprint | ✅ PASS | 5 deps total: `@xyflow/react`, `@dagrejs/dagre`, `tailwindcss`, `@anthropic-ai/sdk`. All justified. |
| P2 — Build Gate | ✅ PASS | `netlify.toml` included in task list; build must pass before deploy. |
| P3 — Testing Discipline | ✅ PASS | Unit tests for `lib/mdp.js` + `lib/ai/parseResponse.js`. |
| P4 — Netlify Compatibility | ✅ PASS | Chat Route Handler uses App Router; compatible with Netlify Next.js plugin serverless. API keys set in Netlify env UI. |
| P5 — JavaScript Only | ✅ PASS | No TypeScript; JSDoc annotations on all `lib/` exports. |

---

## Technical Context

- **Framework:** Next.js 14 App Router, JavaScript
- **Graph canvas:** `@xyflow/react` v12
- **Auto-layout:** `@dagrejs/dagre`
- **Styling:** Tailwind CSS
- **State management:** React `useState` + `useReducer` (no Redux/Zustand)
- **Persistence:** `localStorage` (key: `mdp_graph_v1`)
- **Testing:** Jest + React Testing Library
- **Deployment:** Netlify static export (`output: 'export'` in `next.config.js`)
- **Target users:** ~100 concurrent users (no auth)
- **AI backends:** Minimax (`MiniMax-Text-01`) default; Claude (`claude-sonnet-4-6`) toggle
- **AI keys:** `MINIMAX_KEY`, `ANTHROPIC_KEY` — read server-side in Route Handler only

---

## Phase 1 — Project Bootstrap

### Task 1.1 — Next.js project init

```bash
npx create-next-app@latest . --js --app --no-typescript --tailwind --eslint
```

Produces: `app/`, `app/layout.js`, `app/page.js`, `next.config.js`, `eslint.config.js`

### Task 1.2 — Install dependencies

```bash
npm install @xyflow/react @dagrejs/dagre @anthropic-ai/sdk
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

### Task 1.3 — Configure Jest

File: `jest.config.js`
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.js'],
})
```

File: `jest.setup.js`
```js
import '@testing-library/jest-dom'
```

### Task 1.4 — Configure Netlify

File: `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

File: `next.config.js` — keep default (not static export; use Netlify Next.js plugin
for SSR/RSC compatibility instead of `output: 'export'`).

### Task 1.5 — Add npm scripts

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "lint": "next lint",
  "test": "jest"
}
```

---

## Phase 2 — MDP Computation Engine (`lib/mdp.js`)

This is the algorithmic core. All functions are pure (no side effects, no React).

### Task 2.1 — `topologicalSort(nodes, edges)`

Kahn's algorithm:
1. Compute in-degree for each node.
2. Initialize queue with nodes of in-degree 0.
3. Pop node → add to order → decrement neighbours' in-degrees → enqueue if 0.
4. If order.length !== nodes.length → cycle exists (should not happen post-validation).

### Task 2.2 — `wouldCreateCycle(nodes, edges, newEdge)`

DFS-based cycle check:
1. Build adjacency list including `newEdge`.
2. DFS from `newEdge.source` — if `newEdge.target` is reachable from itself, cycle exists.
3. Return boolean.

### Task 2.3 — `validateGraph(nodes, edges)`

Run rules V1–V5 (see data-model.md). Return `ValidationResult`.

Priority: errors block compute (V1, V2, V3); warnings shown but don't block (V4, V5).

### Task 2.4 — `computeValues(nodes, edges)`

Backward induction (see data-model.md pseudocode).

Returns new node/edge arrays with `computedValue` and `isOptimal` populated.

### Task 2.5 — Unit tests (`__tests__/lib/mdp.test.js`)

Test cases (minimum):
- Linear chain: S0 → A0 → S1(leaf, R=10). V(S0) = 10, Q(A0) = 10.
- Two actions: S0 → {A1 → S2(R=5), A2 → S3(R=20)}. V(S0) = 20, A2 is optimal.
- Probabilistic: A0 → S1(P=0.7, R=10) + S2(P=0.3, R=0). Q(A0) = 7.
- Cycle detection: adding edge S1→A0 when A0→S1 already exists → true.
- Missing leaf reward: leaf state with no reward → validation error.
- Type mismatch: state→state edge → validation error.

---

## Phase 3 — Persistence (`lib/storage.js`)

### Task 3.1 — `saveGraph` / `loadGraph`

Strip `computedValue` and `isOptimal` before save (they are derived).
Wrap in try/catch (localStorage may be unavailable in SSR or private mode).

### Task 3.2 — Auto-save hook

`useAutoSave(nodes, edges)` — debounced `useEffect` that calls `saveGraph` 500ms
after any nodes/edges change.

### Task 3.3 — Load on mount

`useEffect(() => { const g = loadGraph(); if (g) dispatch({ type: 'LOAD', payload: g }); }, [])` in root component.

---

## Phase 4 — App State (`app/hooks/useMdpGraph.js`)

### Task 4.1 — Graph reducer

```js
function graphReducer(state, action) {
  switch (action.type) {
    case 'ADD_NODE':     // append node, clear computedValues
    case 'DELETE_NODE':  // remove node + incident edges
    case 'UPDATE_NODE':  // update label/reward
    case 'ADD_EDGE':     // validate first; reject if invalid
    case 'DELETE_EDGE':
    case 'UPDATE_EDGE':  // update probability
    case 'COMPUTE':      // run computeValues, set results
    case 'RESET':        // clear graph
    case 'LOAD':         // load from storage
  }
}
```

### Task 4.2 — `useMdpGraph` hook

Wraps `useReducer(graphReducer, initialState)`. Exposes:
- `nodes`, `edges`
- `computedStatus`: `'idle' | 'computed' | 'error'`
- `validationResult`
- `addNode(type, label)`, `deleteNode(id)`, `updateNode(id, patch)`
- `addEdge(source, target)`, `deleteEdge(id)`, `updateEdge(id, patch)`
- `compute()`, `reset()`

---

## Phase 5 — React Flow Canvas (`app/components/`)

### Task 5.1 — Custom node types

**`StateNode`** — circle shape, displays label + reward + computedValue.
Colour: neutral when idle, blue when computed, gold border if root.

**`ActionNode`** — rounded rectangle / diamond, displays label + reward + Q-value.
Colour: neutral when idle, highlighted green border if `isOptimal`.

### Task 5.2 — Custom edge: `ProbabilityEdge`

Extends React Flow's `BaseEdge`. Renders an editable probability label on action→state edges.
On blur, calls `updateEdge(id, { probability: parseFloat(value) })`.

### Task 5.3 — `GraphCanvas` component

```jsx
'use client'
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react'
// wire nodeTypes, edgeTypes, onConnect, onNodesChange, onEdgesChange
```

`onConnect` callback:
1. Check type constraint (state→action or action→state only).
2. Call `wouldCreateCycle(nodes, edges, newEdge)`.
3. If valid → `addEdge(...)`.
4. If invalid → show inline toast error.

### Task 5.4 — `NodeSidebar` and `EdgeSidebar`

Slide-in panel on node/edge selection. Fields per ui-contract.md.

### Task 5.5 — `AddNodePanel`

Two buttons: "+ State" and "+ Action". Optional label input. Calls `addNode(type, label)`.

### Task 5.6 — `ValidationBanner`

Renders below canvas. Driven by `computedStatus` and `validationResult`.

---

## Phase 6 — Page Assembly (`app/page.js`)

```jsx
'use client'
export default function Home() {
  const graph = useMdpGraph()
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  // ...
  return (
    <main>
      <Header onCompute={graph.compute} onReset={graph.reset} />
      <div className="flex h-screen">
        <Sidebar>
          <AddNodePanel onAdd={graph.addNode} />
          <NodeSidebar node={selectedNode} onChange={...} />
          <EdgeSidebar edge={selectedEdge} onChange={...} />
        </Sidebar>
        <GraphCanvas
          nodes={graph.nodes}
          edges={graph.edges}
          onConnect={...}
          onNodeSelect={setSelectedNode}
          onEdgeSelect={setSelectedEdge}
          ...
        />
      </div>
      <ValidationBanner status={graph.computedStatus} result={graph.validationResult} />
    </main>
  )
}
```

---

## Phase 7 — Auto-layout (Optional Enhancement)

### Task 7.1 — "Auto-arrange" button

Uses `@dagrejs/dagre` to compute x/y positions for all nodes.
Calls `graph.updateNode` for each node with new position.
Direction: top-to-bottom (`rankdir: 'TB'`).

---

## Phase 8 — AI Chat Backend

The chat feature uses a Next.js App Router Route Handler as the AI proxy. API keys
are read server-side and never sent to the browser.

### Task 8.1 — Shared prompt and parser: `lib/ai/prompt.js` + `lib/ai/parseResponse.js`

**`prompt.js`** — exports:
- `SYSTEM_PROMPT` (string constant, the full MDP instruction prompt)
- `buildUserMessage(userText, graph)` — serializes the current graph into the user turn

**`parseResponse.js`** — exports:
- `parseAIResponse(rawText)` — strips markdown fences, JSON.parses, returns
  `{ reply, operations }`. Returns safe fallback on parse error.

Unit tests (`__tests__/lib/ai/parseResponse.test.js`):
- Valid JSON → extracts `message` and `operations` correctly.
- JSON wrapped in fences → strips fences and parses.
- Malformed JSON → returns fallback `{ reply: "...", operations: [] }`.
- Missing `operations` field → returns empty array.

### Task 8.2 — Minimax client: `lib/ai/minimax.js`

```js
/**
 * @param {Array<{role:string, content:string}>} messages - Full conversation
 * @param {{ nodes, edges }} graph
 * @returns {Promise<{ reply: string, operations: GraphOperation[] }>}
 */
export async function callMinimax(messages, graph) {
  const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MINIMAX_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(0, -1),
        { role: 'user', content: buildUserMessage(messages.at(-1).content, graph) },
      ],
      temperature: 0.3,
      max_completion_tokens: 2048,
    }),
  })
  const data = await res.json()
  return parseAIResponse(data.choices[0].message.content)
}
```

### Task 8.3 — Claude client: `lib/ai/claude.js`

```js
import Anthropic from '@anthropic-ai/sdk'

/**
 * @param {Array<{role:string, content:string}>} messages
 * @param {{ nodes, edges }} graph
 * @returns {Promise<{ reply: string, operations: GraphOperation[] }>}
 */
export async function callClaude(messages, graph) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      ...messages.slice(0, -1),
      { role: 'user', content: buildUserMessage(messages.at(-1).content, graph) },
    ],
  })
  return parseAIResponse(response.content[0].text)
}
```

### Task 8.4 — Route Handler: `app/api/chat/route.js`

```js
import { callMinimax } from '@/lib/ai/minimax'
import { callClaude } from '@/lib/ai/claude'

export async function POST(request) {
  const { messages, graph, model } = await request.json()
  try {
    const result = model === 'claude'
      ? await callClaude(messages, graph)
      : await callMinimax(messages, graph)
    return Response.json({ ...result, model })
  } catch (err) {
    return Response.json(
      { reply: 'AI request failed. Please try again.', operations: [], model },
      { status: 500 }
    )
  }
}
```

### Task 8.5 — `applyOperations` helper: `lib/ai/applyOperations.js`

Takes the current `{ nodes, edges }` and an array of `GraphOperation[]` and returns
updated `{ nodes, edges }` after applying each operation in order.

Resolves labels to node IDs. Calls `wouldCreateCycle` and type-constraint check before
each `add_edge`. Skips (logs warning) rather than throws on invalid operations, so a
partially-invalid response doesn't abort the whole batch.

### Task 8.6 — Chat UI: `app/components/ChatPanel.jsx`

A slide-in panel anchored to the right side of the screen (width ~380px).

Sections (top to bottom):
1. **Header**: "AI Assistant" title + model toggle (`<select>` with Minimax/Claude) + close button
2. **Message list**: scrollable, user messages right-aligned, assistant messages left-aligned
   - Assistant messages show an "Applied N changes" badge when `operations.length > 0`
3. **Input area**: `<textarea>` (auto-resize) + Send button
   - Disabled while `loading === true`
   - Enter sends; Shift+Enter inserts newline

### Task 8.7 — Wire `ChatPanel` into page (`app/page.js`)

Add a "Chat" FAB (floating action button) in the bottom-right corner.
Clicking it toggles `chatOpen` state.

```jsx
<ChatPanel
  open={chatOpen}
  onClose={() => setChatOpen(false)}
  graph={{ nodes: graph.nodes, edges: graph.edges }}
  onOperations={(ops) => {
    const updated = applyOperations({ nodes: graph.nodes, edges: graph.edges }, ops)
    graph.loadGraph(updated)  // dispatch LOAD action
  }}
/>
```

After operations are applied, if `ops` contains `{ op: 'compute' }`, trigger
`graph.compute()` automatically.

---

## Phase 9 — CI / Build Checks

### Task 9.1 — Netlify build pipeline

Netlify auto-runs `npm run build` on push. No extra config needed beyond `netlify.toml`.
Set `MINIMAX_KEY` and `ANTHROPIC_KEY` in Netlify environment variable UI.

### Task 9.2 — Add `lint` and `test` to build script (optional pre-deploy hook)

```toml
[build]
  command = "npm run lint && npm test -- --passWithNoTests && npm run build"
```

Or configure as a separate Netlify build plugin / GitHub Action if desired.

---

## Deliverables Checklist

**Infrastructure**
- [ ] `netlify.toml`
- [ ] `next.config.js`
- [ ] `jest.config.js` + `jest.setup.js`
- [ ] `.env` (gitignored; `MINIMAX_KEY` + `ANTHROPIC_KEY`)
- [ ] `.gitignore` (ensure `.env` is listed)

**MDP Engine**
- [ ] `lib/mdp.js` (pure computation engine)
- [ ] `lib/storage.js` (localStorage persistence)

**AI Chat Backend**
- [ ] `lib/ai/prompt.js` (SYSTEM_PROMPT + buildUserMessage)
- [ ] `lib/ai/parseResponse.js` (JSON parsing + fallback)
- [ ] `lib/ai/minimax.js` (Minimax API client)
- [ ] `lib/ai/claude.js` (Anthropic SDK client)
- [ ] `lib/ai/applyOperations.js` (apply GraphOperation[] to graph state)
- [ ] `app/api/chat/route.js` (Route Handler)

**App State**
- [ ] `app/hooks/useMdpGraph.js` (graph reducer + hook)

**UI Components**
- [ ] `app/components/GraphCanvas.jsx`
- [ ] `app/components/StateNode.jsx`
- [ ] `app/components/ActionNode.jsx`
- [ ] `app/components/ProbabilityEdge.jsx`
- [ ] `app/components/NodeSidebar.jsx`
- [ ] `app/components/EdgeSidebar.jsx`
- [ ] `app/components/AddNodePanel.jsx`
- [ ] `app/components/ValidationBanner.jsx`
- [ ] `app/components/ChatPanel.jsx`

**Pages**
- [ ] `app/page.js` (main page + Chat FAB)
- [ ] `app/layout.js`

**Tests**
- [ ] `__tests__/lib/mdp.test.js` (≥6 test cases)
- [ ] `__tests__/lib/ai/parseResponse.test.js` (≥4 test cases)

**Quality Gates**
- [ ] ESLint passes clean (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] `next build` passes

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| React Flow `onConnect` fires before validation | Low | Validate in `onConnect` callback; do not call addEdge if invalid |
| Probability labels overlap edges at high zoom | Medium | Use React Flow edge label offset; fallback to tooltip |
| Large graphs (>50 nodes) slow topological sort | Low | O(V+E) Kahn's is fast enough; DAG constraint limits depth |
| localStorage quota exceeded | Very low | ~100 nodes * ~500 bytes = 50 KB; well within 5 MB limit |
| Netlify Next.js plugin version mismatch | Low | Pin `@netlify/plugin-nextjs` version in `package.json` |
| Minimax API returns non-JSON despite prompt | Medium | `parseAIResponse` strips fences and has try/catch fallback |
| Minimax model name changes / deprecated | Medium | Centralise model string in `lib/ai/minimax.js`; easy to update |
| AI emits `clear_graph` unintentionally | Low | System prompt explicitly conditions `clear_graph` on full rebuilds only |
| API key leaked via client bundle | None | Keys only read in `app/api/chat/route.js` (server-side); never imported client-side |
| Netlify serverless cold start latency on chat | Low | Acceptable for ~100 users; no keep-alive needed |
