# Chat Contract: AI Graph Builder

**Date:** 2026-04-17

---

## Route Handler: `app/api/chat/route.js`

### Request

```
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user",      "content": "I need to decide whether to invest..." },
    { "role": "assistant", "content": "I'll build that graph for you." }
  ],
  "graph": {
    "nodes": [ ...MdpNode[] ],
    "edges": [ ...MdpEdge[] ]
  },
  "model": "minimax"
}
```

### Response (200 OK)

```json
{
  "reply": "I've built the decision graph. Investing has a higher expected value (7.0).",
  "operations": [
    { "op": "clear_graph" },
    { "op": "add_node", "type": "state",  "label": "Decision",  "reward": 0 },
    { "op": "add_node", "type": "action", "label": "Invest",    "reward": 0 },
    { "op": "add_node", "type": "action", "label": "Don't Invest" },
    { "op": "add_node", "type": "state",  "label": "Win",       "reward": 10 },
    { "op": "add_node", "type": "state",  "label": "Lose",      "reward": -2 },
    { "op": "add_node", "type": "state",  "label": "Safe",      "reward": 1 },
    { "op": "add_edge", "source": "Decision",    "target": "Invest" },
    { "op": "add_edge", "source": "Decision",    "target": "Don't Invest" },
    { "op": "add_edge", "source": "Invest",      "target": "Win",  "probability": 0.7 },
    { "op": "add_edge", "source": "Invest",      "target": "Lose", "probability": 0.3 },
    { "op": "add_edge", "source": "Don't Invest","target": "Safe", "probability": 1.0 },
    { "op": "compute" }
  ],
  "model": "minimax"
}
```

### Response (400 Bad Request) — validation failure

```json
{
  "error": "Invalid model specified"
}
```

### Response (500 Internal Server Error) — AI API failure

```json
{
  "error": "Upstream AI request failed",
  "reply": "Sorry, I couldn't process that. Please try again.",
  "operations": []
}
```

---

## System Prompt (sent to both models)

```
You are an assistant that helps users model decisions as Markov Decision Processes (MDPs).

An MDP graph has:
- STATE nodes: represent situations. Each may have a numeric reward.
- ACTION nodes: represent choices the user can make from a state.
- EDGES: State→Action (no probability needed). Action→State (requires a probability).
  All edges from a single Action node must have probabilities summing to 1.0.
- LEAF STATES: states with no outgoing actions. They MUST have a reward.

Rules:
- The graph must be a DAG (no cycles).
- States only connect to Actions; Actions only connect to States.

When the user describes a decision problem, extract the states, actions, and probabilities,
then respond with a JSON object ONLY — no surrounding text, just raw JSON:

{
  "message": "<your explanation to the user>",
  "operations": [ <ordered list of graph operations> ]
}

Available operations:
- { "op": "clear_graph" }
- { "op": "add_node", "type": "state"|"action", "label": "<name>", "reward": <number or omit> }
- { "op": "add_edge", "source": "<label>", "target": "<label>", "probability": <0-1 or omit> }
- { "op": "set_reward", "label": "<label>", "reward": <number> }
- { "op": "set_probability", "source": "<label>", "target": "<label>", "probability": <0-1> }
- { "op": "compute" }

Current graph state is provided in each request for context.
If the user asks to modify the existing graph (not replace it), do NOT emit clear_graph.
Always end with { "op": "compute" } when the graph is structurally complete.
```

---

## Minimax API Call Shape

```js
// lib/ai/minimax.js
const response = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MINIMAX_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'MiniMax-Text-01',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationMessages,
      { role: 'user', content: buildUserMessage(userText, currentGraph) },
    ],
    temperature: 0.3,
    max_completion_tokens: 2048,
  }),
})
const data = await response.json()
const raw = data.choices[0].message.content
```

---

## Claude API Call Shape

```js
// lib/ai/claude.js
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  system: SYSTEM_PROMPT,
  messages: [
    ...conversationMessages,
    { role: 'user', content: buildUserMessage(userText, currentGraph) },
  ],
})
const raw = response.content[0].text
```

---

## JSON Parse Strategy

Both models are instructed to return raw JSON. Parsing:

```js
function parseAIResponse(raw) {
  try {
    // Strip markdown code fences if model wraps response anyway
    const cleaned = raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim()
    const parsed = JSON.parse(cleaned)
    return {
      reply: parsed.message ?? 'Done.',
      operations: Array.isArray(parsed.operations) ? parsed.operations : [],
    }
  } catch {
    return {
      reply: "I couldn't parse the response. Try rephrasing your request.",
      operations: [],
    }
  }
}
```

---

## Component: `ChatPanel`

```js
/**
 * @param {Object} props
 * @param {{ nodes: MdpNode[], edges: MdpEdge[] }} props.graph   - Current graph (read-only snapshot)
 * @param {function(GraphOperation[]): void} props.onOperations  - Apply operations to graph
 * @param {boolean} props.open        - Whether panel is visible
 * @param {function(): void} props.onClose
 */
```

**Internal state:**
- `messages: ChatMessage[]` — conversation history
- `input: string` — current text field value
- `model: 'minimax'|'claude'` — selected model (default `'minimax'`)
- `loading: boolean` — true while awaiting API response

**Behaviour:**
1. User types message → hits Send (or Enter).
2. Append `{ role: 'user', content: input }` to messages. Show loading indicator.
3. POST to `/api/chat` with `{ messages, graph, model }`.
4. Receive `{ reply, operations }`.
5. Call `props.onOperations(operations)` to apply graph changes.
6. Append `{ role: 'assistant', content: reply, operations }` to messages.
7. Auto-scroll to bottom of message list.

**Model toggle:** A `<select>` or two-button toggle in the panel header.
Changing model mid-conversation is allowed; the full history is always sent.

**Graph context injected per turn:**

```js
function buildUserMessage(userText, graph) {
  const summary = `Current graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges.\n` +
    `Nodes: ${graph.nodes.map(n => `${n.label}(${n.type}${n.reward != null ? ',R='+n.reward : ''})`).join(', ')}\n` +
    `Edges: ${graph.edges.map(e => `${e.source}->${e.target}${e.probability != null ? '(P='+e.probability+')' : ''}`).join(', ')}\n\n` +
    `User: ${userText}`
  return summary
}
```
