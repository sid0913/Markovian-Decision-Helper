import { wouldCreateCycle } from '@/lib/mdp'

const clampReward = r => (r == null ? null : Math.max(-50, Math.min(50, r)))

function uid() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
function edgeUid() {
  return `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Apply an ordered list of GraphOperations to the current graph state.
 * Invalid operations are skipped with a console warning (no throw).
 * @param {{ nodes: Array, edges: Array }} graph
 * @param {Array<Object>} operations
 * @returns {{ nodes: Array, edges: Array }}
 */
export function applyOperations({ nodes, edges }, operations) {
  let ns = [...nodes]
  let es = [...edges]

  for (const op of operations) {
    try {
      switch (op.op) {
        case 'clear_graph':
          ns = []
          es = []
          break

        case 'add_node': {
          const exists = ns.find(n => n.label === op.label)
          if (exists) break
          const offset = () => (Math.random() - 0.5) * 120
          ns = [
            ...ns,
            {
              id: uid(),
              type: op.type,
              label: op.label,
              reward: clampReward(op.reward),
              computedValue: null,
              isOptimal: false,
              position: { x: 300 + offset(), y: 200 + offset() },
            },
          ]
          break
        }

        case 'add_edge': {
          const src = ns.find(n => n.label === op.source)
          const tgt = ns.find(n => n.label === op.target)
          if (!src || !tgt) {
            console.warn(`applyOperations: add_edge skipped — unknown label "${op.source}" or "${op.target}"`)
            break
          }
          if (src.type === tgt.type) {
            console.warn(`applyOperations: add_edge skipped — type mismatch ${src.type}→${tgt.type}`)
            break
          }
          if (wouldCreateCycle(ns, es, { source: src.id, target: tgt.id })) {
            console.warn(`applyOperations: add_edge skipped — would create cycle`)
            break
          }
          es = [
            ...es,
            {
              id: edgeUid(),
              source: src.id,
              target: tgt.id,
              probability: op.probability ?? null,
              isOptimal: false,
              type: 'probability',
            },
          ]
          break
        }

        case 'set_reward': {
          ns = ns.map(n => n.label === op.label ? { ...n, reward: clampReward(op.reward) } : n)
          break
        }

        case 'set_probability': {
          const src = ns.find(n => n.label === op.source)
          const tgt = ns.find(n => n.label === op.target)
          if (!src || !tgt) break
          es = es.map(e =>
            e.source === src.id && e.target === tgt.id
              ? { ...e, probability: op.probability }
              : e
          )
          break
        }

        case 'compute':
          // Handled by the caller — signals that values should be recomputed
          break

        default:
          console.warn(`applyOperations: unknown op "${op.op}"`)
      }
    } catch (err) {
      console.warn('applyOperations: error processing op', op, err)
    }
  }

  return { nodes: ns, edges: es }
}
