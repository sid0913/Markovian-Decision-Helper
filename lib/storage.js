const STORAGE_KEY = 'mdp_graph_v1'

/**
 * Save graph to localStorage. Strips computed/derived fields before saving.
 * @param {{ nodes: Array, edges: Array }} graph
 */
export function saveGraph({ nodes, edges }) {
  try {
    const clean = {
      nodes: nodes.map(({ computedValue, isOptimal, ...rest }) => rest),
      edges: edges.map(({ isOptimal, ...rest }) => rest),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  } catch {
    // localStorage unavailable (SSR, private browsing, quota exceeded)
  }
}

/**
 * Load graph from localStorage.
 * @returns {{ nodes: Array, edges: Array } | null}
 */
export function loadGraph() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.nodes || !parsed?.edges) return null
    return parsed
  } catch {
    return null
  }
}
