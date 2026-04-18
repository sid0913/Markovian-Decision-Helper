# Tasks: MDP Decision Tool

**Generated:** 2026-04-17
**Plan:** `.specify/plan/plan.md`
**Branch:** `feat/mdp-tool`

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| US1 | Manual Graph Builder — drag-drop states/actions, draw edges, set rewards/probabilities, DAG enforced | P1 |
| US2 | Expected Value Computation — backward induction, V(s)/Q(s,a) displayed, optimal path highlighted | P1 |
| US3 | Graph Persistence — auto-save to localStorage, restore on reload | P2 |
| US4 | AI Chat Agent — describe problem in natural language; AI builds/modifies graph; Minimax/Claude toggle | P2 |
| US5 | Auto-layout — dagre auto-arrange button | P3 |

---

## Dependency Order

```
Phase 1 (Setup) → Phase 2 (Foundational MDP engine)
  → Phase 3 (US1 Graph Builder)     [needs Phase 2]
    → Phase 4 (US2 Computation)     [needs Phase 3]
      → Phase 5 (US3 Persistence)   [needs Phase 3]
      → Phase 6 (US4 AI Chat)       [needs Phase 3 + Phase 2]
        → Phase 7 (US5 Auto-layout) [needs Phase 3]
          → Phase 8 (Polish)        [needs all]
```

US3, US4, US5 are independent of each other and can be worked in parallel after Phase 3.

---

## Phase 1 — Setup

**Goal:** Working Next.js project with all dependencies, Jest config, and Netlify config.

**Independent test criteria:** `npm run dev` starts without error; `npm test` runs (no tests yet, exit 0); `npm run build` succeeds.

- [x] T001 Initialize Next.js 14 App Router project (JS, Tailwind, ESLint): run `npx create-next-app@latest . --js --app --no-typescript --tailwind --eslint`
- [x] T002 Install runtime dependencies in `package.json`: `npm install @xyflow/react @dagrejs/dagre @anthropic-ai/sdk`
- [x] T003 Install dev dependencies in `package.json`: `npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
- [x] T004 Create `jest.config.js` using `next/jest` wrapper with `jest-environment-jsdom` and `setupFilesAfterFramework: ['<rootDir>/jest.setup.js']`
- [x] T005 Create `jest.setup.js` importing `@testing-library/jest-dom`
- [x] T006 Create `netlify.toml` with build command `npm run build`, publish `.next`, and `@netlify/plugin-nextjs` plugin entry
- [x] T007 Verify `next.config.js` does NOT set `output: 'export'` (Netlify plugin handles SSR/Route Handlers)
- [x] T008 Update `package.json` scripts: add `"test": "jest"` and `"lint": "next lint"`
- [x] T009 [P] Create `.env` file (gitignored) with placeholder keys: `MINIMAX_KEY=` and `ANTHROPIC_KEY=`
- [x] T010 [P] Verify `.gitignore` contains `.env` and `.next/`

---

## Phase 2 — Foundational: MDP Computation Engine

**Goal:** Pure JS computation library that can be unit-tested in isolation with no React dependency.

**Independent test criteria:** `npm test` runs `__tests__/lib/mdp.test.js` and all 6+ cases pass.

- [x] T011 Create `lib/mdp.js` with exported function `topologicalSort(nodes, edges)` using Kahn's algorithm; returns node ID array in topological order; throws if cycle detected (should not happen post-validation)
- [x] T012 Add exported function `wouldCreateCycle(nodes, edges, newEdge)` to `lib/mdp.js`; DFS from `newEdge.source` over adjacency list including `newEdge`; returns boolean
- [x] T013 Add exported function `validateGraph(nodes, edges)` to `lib/mdp.js`; checks rules V1 (type alternation), V2 (no cycle), V3 (leaf states have reward); returns `{ valid, errors: [{ code, message, nodeIds }] }`
- [x] T014 Add exported function `computeValues(nodes, edges)` to `lib/mdp.js`; runs topological sort, then backward induction: leaf states V=reward, action Q=reward+Σ(P·V(child)), non-leaf state V=reward+max(Q(children)); returns new node/edge arrays with `computedValue` and `isOptimal` set
- [x] T015 Create `__tests__/lib/mdp.test.js` with the following test cases: (1) linear chain S0→A0→S1(R=10): V(S0)=10, Q(A0)=10; (2) two actions S0→{A1→S2(R=5), A2→S3(R=20)}: V(S0)=20, A2 isOptimal; (3) probabilistic A0→S1(P=0.7,R=10)+S2(P=0.3,R=0): Q(A0)=7; (4) cycle detection returns true; (5) missing leaf reward returns validation error with correct nodeId; (6) state→state edge returns type mismatch error

---

## Phase 3 — US1: Manual Graph Builder

**Story:** A user can add state and action nodes to a canvas, drag them to position them, draw directed edges between them (state→action→state only), set labels, rewards, and probabilities on edges, and the graph is always kept as a valid DAG with type constraints enforced on every connection attempt.

**Independent test criteria:** App loads; user can add a State and Action node via sidebar, drag them on canvas, connect State→Action (succeeds), connect State→State (rejected with toast), connect Action back to existing State to form a cycle (rejected). Node sidebar shows label and reward fields. Edge sidebar shows probability field only on action→state edges.

- [x] T016 Create `app/hooks/useMdpGraph.js`: implement `graphReducer` handling cases ADD_NODE (append, clear computedValues), DELETE_NODE (remove + incident edges), UPDATE_NODE, ADD_EDGE (validate type + cycle first, reject if invalid), DELETE_EDGE, UPDATE_EDGE, COMPUTE, RESET, LOAD
- [x] T017 Export `useMdpGraph()` hook from `app/hooks/useMdpGraph.js` wrapping `useReducer(graphReducer, { nodes:[], edges:[], computedStatus:'idle', validationResult:null })`; expose nodes, edges, computedStatus, validationResult, addNode, deleteNode, updateNode, addEdge, deleteEdge, updateEdge, compute, reset
- [x] T018 [P] Create `app/components/StateNode.jsx` as a React Flow custom node: circle shape via Tailwind, displays `data.label`, `data.reward` (if set), `data.computedValue` (if set) in a styled bubble; Handle and source/target positions top/bottom
- [x] T019 [P] Create `app/components/ActionNode.jsx` as a React Flow custom node: rounded rectangle shape, displays `data.label`, `data.reward`, `data.computedValue`; green border ring when `data.isOptimal === true`; Handle positions
- [x] T020 [P] Create `app/components/ProbabilityEdge.jsx` extending React Flow `BaseEdge`; renders an editable `<input type="number">` label mid-edge only when `data.sourceType === 'action'`; on blur calls `data.onProbabilityChange(id, value)`
- [x] T021 Create `app/components/GraphCanvas.jsx` as `'use client'`; imports ReactFlow, Background, Controls, MiniMap; registers `nodeTypes = { state: StateNode, action: ActionNode }` and `edgeTypes = { probability: ProbabilityEdge }`; `onConnect` callback checks type constraint then calls `wouldCreateCycle`; if valid calls `props.onConnect(edge)`; if invalid shows inline error message state
- [x] T022 [P] Create `app/components/AddNodePanel.jsx`: two buttons "+ State" and "+ Action"; optional label text input with default "State N" / "Action N"; on submit calls `props.onAdd(type, label)` with node placed at canvas center + random ±50px offset
- [x] T023 [P] Create `app/components/NodeSidebar.jsx`: renders when `props.node !== null`; label text input, reward number input (optional), read-only type badge, read-only computed value display; all changes call `props.onChange(patch)`
- [x] T024 [P] Create `app/components/EdgeSidebar.jsx`: renders when `props.edge !== null`; probability number input visible only when source node type is 'action'; on change calls `props.onChange(patch)`
- [x] T025 Create `app/page.js` as `'use client'`; import and wire `useMdpGraph`; manage `selectedNodeId`, `selectedEdgeId` state; render header with "Compute" and "Reset" buttons, left sidebar panel containing `AddNodePanel` + `NodeSidebar` + `EdgeSidebar`, and `GraphCanvas` taking remaining width; pass all props per `contracts/ui-contract.md`

---

## Phase 4 — US2: Expected Value Computation

**Story:** A user clicks "Compute" and immediately sees V(s) and Q(s,a) values displayed inside every node bubble. The optimal action from each state is highlighted with a green edge. If any leaf state is missing a reward, a validation error banner identifies the offending node(s) by label. The user can fix the issue and recompute.

**Independent test criteria:** With a complete valid graph (all leaf states have rewards, probabilities sum to 1), clicking Compute shows numeric values on all nodes and highlights the optimal path. With a leaf state missing a reward, Compute shows a red banner naming the node. After fixing, Compute clears the error.

- [x] T026 Create `app/components/ValidationBanner.jsx`: hidden when `props.status === 'idle'`; green bar "Expected values computed. Optimal path highlighted in green." when `status === 'computed'`; red bar listing each `error.message` with bold node label when `status === 'error'`
- [x] T027 Wire `graph.compute()` to the Header "Compute" button in `app/page.js`; after dispatch, `computedStatus` and `validationResult` flow to `ValidationBanner`
- [x] T028 Update `StateNode.jsx` to render `data.computedValue` formatted to 2 decimal places in a secondary line inside the bubble; apply blue background tint when `data.computedValue !== null`
- [x] T029 Update `ActionNode.jsx` to render `data.computedValue` (Q-value) formatted to 2 decimal places; apply green border ring when `data.isOptimal === true`; apply amber/gold border when node is a root action (parent state has no incoming edges)

---

## Phase 5 — US3: Graph Persistence

**Story:** A user's graph is automatically saved to `localStorage` after every change (debounced 500ms). On page reload, the saved graph is restored instantly. The user never loses work between sessions.

**Independent test criteria:** Build a small graph, refresh the page — nodes, edges, labels, and rewards all reload. Computed values are NOT restored (recompute required). Clearing the graph via Reset removes the localStorage entry.

- [x] T030 Create `lib/storage.js` with exported `saveGraph({ nodes, edges })`: strips `computedValue` and `isOptimal` from nodes/edges before JSON.stringify; writes to `localStorage` key `mdp_graph_v1`; wrapped in try/catch
- [x] T031 Add exported `loadGraph()` to `lib/storage.js`: reads `localStorage` key `mdp_graph_v1`; JSON.parses; returns `{ nodes, edges }` or `null`; wrapped in try/catch
- [x] T032 Add `useAutoSave(nodes, edges)` custom hook inside `app/hooks/useMdpGraph.js` using `useEffect` with 500ms debounce via `setTimeout`/`clearTimeout`; calls `saveGraph({ nodes, edges })` on change
- [x] T033 In `app/page.js` `useEffect` on mount: call `loadGraph()`; if result is non-null dispatch `{ type: 'LOAD', payload: result }` to restore graph
- [x] T034 In `graphReducer` RESET case: call `saveGraph({ nodes: [], edges: [] })` to clear storage in sync with state

---

## Phase 6 — US4: AI Chat Agent

**Story:** A user opens the Chat panel via a floating button, types a description of their decision problem (e.g. "Should I invest £1000? 70% chance to win £500, 30% chance to lose £200"), and the AI (Minimax by default, Claude via toggle) builds the full MDP graph and computes the optimal decision. The user can see the result on the canvas and continue chatting to refine probabilities or rewards. The graph remains fully editable after AI modification.

**Independent test criteria:** With MINIMAX_KEY set, sending a description builds a recognisable graph on the canvas. Model toggle switches to Claude (ANTHROPIC_KEY set) and also builds a graph. Sending a follow-up "change the win probability to 0.6" modifies only the relevant edge without clearing the graph. Malformed AI response does not crash; error shown in chat.

- [x] T035 Create `lib/ai/prompt.js`: export string constant `SYSTEM_PROMPT` (full MDP instruction prompt per `contracts/chat-contract.md`); export `buildUserMessage(userText, graph)` that serialises node list and edge list into a compact summary prepended to the user text
- [x] T036 Create `lib/ai/parseResponse.js`: export `parseAIResponse(rawText)` that strips markdown fences (` ```json ... ``` `), attempts `JSON.parse`, extracts `{ reply: parsed.message, operations: parsed.operations ?? [] }`; on any error returns `{ reply: "I couldn't parse that response. Try rephrasing.", operations: [] }`
- [x] T037 Create `__tests__/lib/ai/parseResponse.test.js` with cases: (1) valid raw JSON → correct reply and operations; (2) JSON wrapped in ` ```json ``` ` fences → strips and parses; (3) completely malformed string → fallback object; (4) valid JSON missing `operations` field → returns empty array
- [x] T038 Create `lib/ai/minimax.js`: export `callMinimax(messages, graph)` using `fetch` to `https://api.minimax.io/v1/text/chatcompletion_v2` with Bearer `process.env.MINIMAX_KEY`, model `MiniMax-Text-01`, temperature 0.3, max_completion_tokens 2048; inject SYSTEM_PROMPT as system message; build user turn via `buildUserMessage`; return `parseAIResponse(data.choices[0].message.content)`
- [x] T039 Create `lib/ai/claude.js`: export `callClaude(messages, graph)` using `new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })`; call `client.messages.create` with model `claude-sonnet-4-6`, max_tokens 2048, system `SYSTEM_PROMPT`; build user turn via `buildUserMessage`; return `parseAIResponse(response.content[0].text)`
- [x] T040 Create `lib/ai/applyOperations.js`: export `applyOperations({ nodes, edges }, operations)`; process each operation in order: `clear_graph` → empty arrays; `add_node` → generate UUID, append (skip if label already exists); `add_edge` → resolve source/target by label, run type check + `wouldCreateCycle`, skip with `console.warn` if invalid; `set_reward` → find node by label, update reward; `set_probability` → find edge by source+target label, update probability; `compute` → no-op (caller handles); return `{ nodes, edges }`
- [x] T041 Create `app/api/chat/route.js`: export `async function POST(request)`; parse body `{ messages, graph, model }`; call `callClaude` or `callMinimax` based on model; on success return `Response.json({ reply, operations, model })`; on error return `Response.json({ reply: 'AI request failed...', operations: [], model }, { status: 500 })`
- [x] T042 Create `app/components/ChatPanel.jsx` as `'use client'`; internal state: `messages[]`, `input`, `model` (default `'minimax'`), `loading`; renders fixed right panel (w-96) with header (title + `<select>` Minimax/Claude toggle + close button), scrollable message list (user right-aligned, assistant left-aligned, assistant messages show "Applied N graph changes" badge when `operations.length > 0`), and textarea + Send button (disabled during loading); Enter sends, Shift+Enter newlines; auto-scrolls to bottom on new message
- [x] T043 Wire `ChatPanel` into `app/page.js`: add `chatOpen` state; add floating "Chat" button fixed bottom-right; render `<ChatPanel open={chatOpen} onClose={...} graph={...} onOperations={ops => { const updated = applyOperations(...); dispatch({ type:'LOAD', payload: updated }); if (ops.some(o => o.op==='compute')) graph.compute() }} />`

---

## Phase 7 — US5: Auto-layout

**Story:** A user clicks "Auto-arrange" and the graph nodes reposition themselves into a clean top-to-bottom hierarchy using dagre, without changing any graph data.

**Independent test criteria:** With a multi-level graph, clicking Auto-arrange repositions nodes so they don't overlap and flow top-to-bottom. Edge connections remain correct. No nodes/edges are added or removed.

- [x] T044 Add `autoLayout(nodes, edges)` utility in `app/components/GraphCanvas.jsx` (or `lib/layout.js`): uses `@dagrejs/dagre` to compute x/y for each node with `rankdir:'TB'`, node size 150×60; returns updated nodes array with new positions
- [x] T045 Add "Auto-arrange" button to the Header in `app/page.js`; on click call `autoLayout(nodes, edges)` and dispatch `{ type: 'LOAD', payload: { nodes: arranged, edges } }` to update positions

---

## Phase 8 — Polish & Cross-Cutting Concerns

**Goal:** Production-quality UX, clean ESLint, passing build, Netlify deploy-ready.

- [x] T046 Update `app/layout.js`: set page title "MDP Decision Tool", add meta description, import `@xyflow/react/dist/style.css` (required by React Flow), set `<html lang="en">`
- [x] T047 [P] Add JSDoc `@param` / `@returns` annotations to all exported functions in `lib/mdp.js`, `lib/storage.js`, `lib/ai/prompt.js`, `lib/ai/parseResponse.js`, `lib/ai/minimax.js`, `lib/ai/claude.js`, `lib/ai/applyOperations.js`
- [x] T048 [P] Add empty-state UI to `GraphCanvas.jsx`: when `nodes.length === 0`, overlay a centered hint message "Add a State or Action from the sidebar, or open Chat to describe your decision"
- [x] T049 [P] Add toast/inline error display inside `GraphCanvas.jsx` for rejected `onConnect` events (cycle or type mismatch); show for 3 seconds then hide
- [x] T050 Update `netlify.toml` build command to `npm run lint && npm test -- --passWithNoTests && npm run build` to enforce lint and test gates before every Netlify deploy
- [x] T051 Run `npm run lint` and fix all ESLint errors/warnings until exit code is 0
- [x] T052 Run `npm test` and confirm all test files pass (mdp.test.js ≥6 cases, parseResponse.test.js ≥4 cases)
- [x] T053 Run `npm run build` and confirm clean build with no errors or runtime-breaking warnings

---

## Summary

| Metric | Value |
|---|---|
| Total tasks | 53 |
| Phase 1 — Setup | 10 tasks |
| Phase 2 — Foundational | 5 tasks |
| Phase 3 — US1 Graph Builder | 10 tasks |
| Phase 4 — US2 Computation | 4 tasks |
| Phase 5 — US3 Persistence | 5 tasks |
| Phase 6 — US4 AI Chat | 9 tasks |
| Phase 7 — US5 Auto-layout | 2 tasks |
| Phase 8 — Polish | 8 tasks |
| Parallelizable tasks [P] | 16 |

**Suggested MVP scope:** Complete Phase 1 → Phase 2 → Phase 3 → Phase 4.
This gives a fully functional manual MDP builder with value computation — the core product.
Phases 5–7 add persistence, AI, and layout on top.

**Parallel opportunities within phases:**
- Phase 3: T018, T019, T020, T022, T023, T024 can all be built simultaneously (different files, no inter-dependency)
- Phase 6: T038 (Minimax client) and T039 (Claude client) are fully parallel
- Phase 6: T037 (parser tests) can be written while T038/T039 are in progress
- Phase 8: T047, T048, T049 are independent polish tasks
