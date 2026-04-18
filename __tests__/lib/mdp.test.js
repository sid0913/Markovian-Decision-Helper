import {
  topologicalSort,
  wouldCreateCycle,
  validateGraph,
  computeValues,
} from '@/lib/mdp'

function makeNode(id, type, label, reward = null) {
  return { id, type, label, reward }
}
function makeEdge(id, source, target, probability = null) {
  return { id, source, target, probability }
}

describe('topologicalSort', () => {
  it('sorts a linear chain S0→A0→S1', () => {
    const nodes = [makeNode('s0','state','S0'), makeNode('a0','action','A0'), makeNode('s1','state','S1')]
    const edges = [makeEdge('e1','s0','a0'), makeEdge('e2','a0','s1')]
    const order = topologicalSort(nodes, edges)
    expect(order.indexOf('s0')).toBeLessThan(order.indexOf('a0'))
    expect(order.indexOf('a0')).toBeLessThan(order.indexOf('s1'))
  })

  it('throws on cyclic graph', () => {
    const nodes = [makeNode('s0','state','S0'), makeNode('a0','action','A0')]
    const edges = [makeEdge('e1','s0','a0'), makeEdge('e2','a0','s0')]
    expect(() => topologicalSort(nodes, edges)).toThrow('Cycle detected')
  })
})

describe('wouldCreateCycle', () => {
  it('detects a cycle when back-edge added', () => {
    const nodes = [makeNode('s0','state','S0'), makeNode('a0','action','A0'), makeNode('s1','state','S1')]
    const edges = [makeEdge('e1','s0','a0'), makeEdge('e2','a0','s1')]
    expect(wouldCreateCycle(nodes, edges, { source: 's1', target: 's0' })).toBe(true)
  })

  it('returns false for a valid new edge', () => {
    const nodes = [makeNode('s0','state','S0'), makeNode('a0','action','A0'), makeNode('s1','state','S1')]
    const edges = [makeEdge('e1','s0','a0')]
    expect(wouldCreateCycle(nodes, edges, { source: 'a0', target: 's1' })).toBe(false)
  })
})

describe('validateGraph', () => {
  it('rejects state→state edge (type mismatch)', () => {
    const nodes = [makeNode('s0','state','S0'), makeNode('s1','state','S1')]
    const edges = [makeEdge('e1','s0','s1')]
    const result = validateGraph(nodes, edges)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.code === 'invalid_edge_type')).toBe(true)
  })

  it('rejects leaf state with no reward', () => {
    const nodes = [makeNode('s0','state','S0'), makeNode('a0','action','A0'), makeNode('s1','state','S1', null)]
    const edges = [makeEdge('e1','s0','a0'), makeEdge('e2','a0','s1',1)]
    const result = validateGraph(nodes, edges)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.code === 'missing_leaf_reward')).toBe(true)
  })

  it('passes a valid complete graph', () => {
    const nodes = [makeNode('s0','state','S0'), makeNode('a0','action','A0'), makeNode('s1','state','S1', 10)]
    const edges = [makeEdge('e1','s0','a0'), makeEdge('e2','a0','s1',1)]
    const result = validateGraph(nodes, edges)
    expect(result.valid).toBe(true)
  })
})

describe('computeValues', () => {
  it('linear chain: V(S0) = 10, Q(A0) = 10', () => {
    const nodes = [makeNode('s0','state','S0',0), makeNode('a0','action','A0',0), makeNode('s1','state','S1',10)]
    const edges = [makeEdge('e1','s0','a0'), makeEdge('e2','a0','s1',1)]
    const { nodes: result } = computeValues(nodes, edges)
    const s0 = result.find(n => n.id === 's0')
    const a0 = result.find(n => n.id === 'a0')
    expect(a0.computedValue).toBeCloseTo(10)
    expect(s0.computedValue).toBeCloseTo(10)
  })

  it('two actions: optimal is A2 → S3(R=20), V(S0) = 20', () => {
    const nodes = [
      makeNode('s0','state','S0',0),
      makeNode('a1','action','A1',0),
      makeNode('a2','action','A2',0),
      makeNode('s2','state','S2',5),
      makeNode('s3','state','S3',20),
    ]
    const edges = [
      makeEdge('e1','s0','a1'), makeEdge('e2','s0','a2'),
      makeEdge('e3','a1','s2',1), makeEdge('e4','a2','s3',1),
    ]
    const { nodes: result } = computeValues(nodes, edges)
    const s0 = result.find(n => n.id === 's0')
    expect(s0.computedValue).toBeCloseTo(20)
  })

  it('probabilistic action: Q(A0) = 0.7*10 + 0.3*0 = 7', () => {
    const nodes = [
      makeNode('s0','state','S0',0),
      makeNode('a0','action','A0',0),
      makeNode('s1','state','S1',10),
      makeNode('s2','state','S2',0),
    ]
    const edges = [
      makeEdge('e1','s0','a0'),
      makeEdge('e2','a0','s1',0.7),
      makeEdge('e3','a0','s2',0.3),
    ]
    const { nodes: result } = computeValues(nodes, edges)
    const a0 = result.find(n => n.id === 'a0')
    expect(a0.computedValue).toBeCloseTo(7)
  })

  it('marks the optimal action edge', () => {
    const nodes = [
      makeNode('s0','state','S0',0),
      makeNode('a1','action','A1',0),
      makeNode('a2','action','A2',0),
      makeNode('s2','state','S2',5),
      makeNode('s3','state','S3',20),
    ]
    const edges = [
      makeEdge('e1','s0','a1'), makeEdge('e2','s0','a2'),
      makeEdge('e3','a1','s2',1), makeEdge('e4','a2','s3',1),
    ]
    const { edges: resultEdges } = computeValues(nodes, edges)
    // Edge s0→a2 should be optimal
    const optEdge = resultEdges.find(e => e.id === 'e2')
    expect(optEdge.isOptimal).toBe(true)
    const nonOpt = resultEdges.find(e => e.id === 'e1')
    expect(nonOpt.isOptimal).toBe(false)
  })
})
