import dagre from '@dagrejs/dagre'

// Match actual rendered sizes (Tailwind w-32 h-32 for state, w-36 h-20 for action)
// plus breathing room as margins
const STATE_W = 148
const STATE_H = 148
const ACTION_W = 160
const ACTION_H = 90

/**
 * Compute a clean top-to-bottom dagre layout, respecting different node sizes
 * for state (circle) vs action (rectangle) nodes.
 * @param {Array<{id:string, type:string}>} nodes
 * @param {Array<{source:string, target:string}>} edges
 * @returns {Array} nodes with updated position fields
 */
export function autoLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    nodesep: 80,   // horizontal gap between siblings on the same rank
    ranksep: 100,  // vertical gap between ranks (state → action → state)
    marginx: 60,
    marginy: 60,
    align: 'UL',
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const n of nodes) {
    const w = n.type === 'state' ? STATE_W : ACTION_W
    const h = n.type === 'state' ? STATE_H : ACTION_H
    g.setNode(n.id, { width: w, height: h })
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    const w = n.type === 'state' ? STATE_W : ACTION_W
    const h = n.type === 'state' ? STATE_H : ACTION_H
    return {
      ...n,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    }
  })
}
