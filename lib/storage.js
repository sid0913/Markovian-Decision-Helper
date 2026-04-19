const STORAGE_KEY = 'mdp_graph_v1'
const SAVES_KEY = 'mdp_saves_v1'

function cleanGraph({ nodes, edges }) {
  return {
    nodes: nodes.map(({ computedValue, isOptimal, ...rest }) => rest),
    edges: edges.map(({ isOptimal, ...rest }) => rest),
  }
}

/** List all named saves. @returns {Array<{id,name,date,nodes,edges}>} */
export function listSaves() {
  try {
    const raw = localStorage.getItem(SAVES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/** Save the current graph under a given name. Returns the new save entry. */
export function saveNamed(name, graph) {
  const saves = listSaves()
  const entry = { id: `save-${Date.now()}`, name: name.trim(), date: new Date().toISOString(), ...cleanGraph(graph) }
  localStorage.setItem(SAVES_KEY, JSON.stringify([entry, ...saves]))
  return entry
}

/** Delete a named save by id. */
export function deleteSave(id) {
  const saves = listSaves().filter(s => s.id !== id)
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves))
}

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
