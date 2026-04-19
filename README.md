# MDP Decision Tool

An interactive browser-based tool for modelling and solving complex decisions using **Markov Decision Processes** — the same mathematical framework behind game-playing AI, robotics, and financial planning.

## What is an MDP?

A Markov Decision Process is a way to model decisions where:

- You are in a **state** (e.g. "I have a job offer to consider")
- You choose an **action** (e.g. "Accept" or "Decline")
- Each action leads to future **states** with some **probability** (e.g. 70% chance of a good outcome)
- Each outcome has a **reward** (a number capturing how good or bad it is)

The tool works backwards from final outcomes to tell you the **expected value of each decision** and highlights the optimal path in green.

### Example: Should you join a startup?

```
Career Now
├── Stay at Job
│   ├── Promotion      (P=0.4, R=+40)
│   └── Plateau        (P=0.6, R=+15)  → Expected Q = 25
│
└── Join Startup
    ├── Startup Wins   (P=0.3, R=+50)
    └── Startup Fails  (P=0.7, R=−25)  → Expected Q = −2.5
```

The MDP tells you: **Stay at Job** (Q = 25) beats **Join Startup** (Q = −2.5), given these probabilities and rewards. Adjust the numbers to match your own beliefs — the optimal decision updates instantly when you recompute.

## Features

- **Drag-and-drop graph builder** — add State and Action nodes, connect them visually
- **Probability edges** — click any Action→State edge to set its probability; the tool validates they sum to 1
- **Backward induction** — one click computes V(s) for every state and Q(s,a) for every action
- **Optimal path highlighting** — the best decision chain is shown in green
- **AI chat assistant** — describe your decision in plain English and the AI builds the graph for you (powered by Minimax or Claude)
- **Auto-layout** — Prettify button arranges the graph cleanly
- **Persistent** — your graph is saved to localStorage automatically
- **Built-in examples** — load Career Decision, Investment Decision, or Startup Journey from the header

## Using the Tool

### Building a graph manually

1. Type a label in the **Add Node** panel and click **+ State** or **+ Action**
2. Drag from the bottom handle of one node to the top handle of another to connect them
   - States must connect to Actions, and Actions must connect to States
3. Click an Action→State edge to set its probability (all probabilities from one action must sum to 1.0)
4. Click a leaf state and set its **Reward** in the sidebar (range: −50 to 50)
5. Click **Compute** — V and Q values appear on every node; the optimal path turns green

### Using the AI assistant

Click the chat bar at the bottom of the screen and describe your decision in plain English:

> *"Should I move cities for a new job? 60% chance I love it (reward 45), 40% chance I regret it (reward −20). Alternatively I stay — it's comfortable but slow (reward 10)."*

The AI builds the graph, sets probabilities and rewards, and computes the best option for you. You can then edit any values manually and recompute.

### Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Delete selected node/edge | `Delete` |
| Send AI message | `Enter` |
| New line in AI chat | `Shift + Enter` |

## Decision Modelling Tips

- **Rewards are relative** — only the differences between outcomes matter. Use −50 to 50 as a scale where 0 is neutral.
- **Probabilities are your beliefs** — set them to reflect how likely you think each outcome actually is. Changing them shows you how sensitive the decision is.
- **Multi-stage decisions** — chain states and actions to model sequences of decisions over time (see the Startup Journey example).
- **Intermediate rewards** — you can add rewards to non-leaf states and action nodes to represent immediate payoffs at each step, not just final outcomes.

## Local Development

```bash
# Requires Node.js >= 20.9.0
nvm use 22   # or: nvm install 22

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env` file in the project root:

```
MINIMAX_KEY=your_minimax_api_key
ANTHROPIC_KEY=your_anthropic_api_key
```

Only one key is required — you can toggle between models in the chat panel.

### Running tests

```bash
npm test
```

### Building for production

```bash
npm run build
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Graph canvas | React Flow (`@xyflow/react`) |
| Auto-layout | Dagre (`@dagrejs/dagre`) |
| Styling | Tailwind CSS v4 |
| AI (default) | Minimax `MiniMax-Text-01` |
| AI (toggle) | Anthropic `claude-sonnet-4-6` |
| MDP engine | Custom (`lib/mdp.js`) — pure JS, zero dependencies |
| Tests | Jest + React Testing Library |
| Hosting | Netlify + `@netlify/plugin-nextjs` |

## How the MDP Solver Works

The solver in [`lib/mdp.js`](lib/mdp.js) implements **backward induction** on a finite acyclic MDP:

1. **Topological sort** (Kahn's algorithm) — finds a valid processing order with no cycles
2. **Leaf states** — `V(s) = R(s)`
3. **Action nodes** — `Q(s,a) = R(a) + Σ P(s'|a) · V(s')`
4. **Non-leaf states** — `V(s) = R(s) + max_a Q(s,a)`
5. The action achieving `max Q` is marked optimal and highlighted green

The graph is validated before computation: type alternation (state↔action only), no cycles, leaf rewards present, and all probability distributions sum to 1.0.
