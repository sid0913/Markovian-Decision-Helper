/**
 * Built-in example MDP graphs.
 * Positions are intentionally omitted — autoLayout is applied on load.
 */
export const EXAMPLES = [
  {
    name: 'Career Decision',
    description: 'Stay at your job or join a startup?',
    nodes: [
      { id: 'n1', type: 'state',  label: 'Career Now',     reward: null },
      { id: 'n2', type: 'action', label: 'Stay at Job',    reward: null },
      { id: 'n3', type: 'action', label: 'Join Startup',   reward: null },
      { id: 'n4', type: 'state',  label: 'Promotion',      reward: 40   },
      { id: 'n5', type: 'state',  label: 'Plateau',        reward: 15   },
      { id: 'n6', type: 'state',  label: 'Startup Wins',   reward: 50   },
      { id: 'n7', type: 'state',  label: 'Startup Fails',  reward: -25  },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', probability: null, isOptimal: false, type: 'probability' },
      { id: 'e2', source: 'n1', target: 'n3', probability: null, isOptimal: false, type: 'probability' },
      { id: 'e3', source: 'n2', target: 'n4', probability: 0.4,  isOptimal: false, type: 'probability' },
      { id: 'e4', source: 'n2', target: 'n5', probability: 0.6,  isOptimal: false, type: 'probability' },
      { id: 'e5', source: 'n3', target: 'n6', probability: 0.3,  isOptimal: false, type: 'probability' },
      { id: 'e6', source: 'n3', target: 'n7', probability: 0.7,  isOptimal: false, type: 'probability' },
    ],
  },
  {
    name: 'Investment Decision',
    description: 'Invest your savings or keep them in cash?',
    nodes: [
      { id: 'n1', type: 'state',  label: 'Savings',       reward: null },
      { id: 'n2', type: 'action', label: 'Invest',        reward: null },
      { id: 'n3', type: 'action', label: 'Keep Cash',     reward: null },
      { id: 'n4', type: 'state',  label: 'Good Year',     reward: 45   },
      { id: 'n5', type: 'state',  label: 'Bad Year',      reward: -20  },
      { id: 'n6', type: 'state',  label: 'Safe Return',   reward: 5    },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', probability: null, isOptimal: false, type: 'probability' },
      { id: 'e2', source: 'n1', target: 'n3', probability: null, isOptimal: false, type: 'probability' },
      { id: 'e3', source: 'n2', target: 'n4', probability: 0.6,  isOptimal: false, type: 'probability' },
      { id: 'e4', source: 'n2', target: 'n5', probability: 0.4,  isOptimal: false, type: 'probability' },
      { id: 'e5', source: 'n3', target: 'n6', probability: 1.0,  isOptimal: false, type: 'probability' },
    ],
  },
  {
    name: 'Startup Journey',
    description: 'Two-stage decision: build then fundraise or bootstrap?',
    nodes: [
      { id: 'n1',  type: 'state',  label: 'Has Idea',       reward: null },
      { id: 'n2',  type: 'action', label: 'Build MVP',      reward: null },
      { id: 'n3',  type: 'action', label: 'Stay Employed',  reward: null },
      { id: 'n4',  type: 'state',  label: 'MVP Works',      reward: null },
      { id: 'n5',  type: 'state',  label: 'MVP Fails',      reward: -20  },
      { id: 'n6',  type: 'state',  label: 'Stable Income',  reward: 20   },
      { id: 'n7',  type: 'action', label: 'Raise Funding',  reward: null },
      { id: 'n8',  type: 'action', label: 'Bootstrap',      reward: null },
      { id: 'n9',  type: 'state',  label: 'Funded',         reward: 50   },
      { id: 'n10', type: 'state',  label: 'Rejected',       reward: 5    },
      { id: 'n11', type: 'state',  label: 'Profitable',     reward: 35   },
      { id: 'n12', type: 'state',  label: 'Breaks Even',    reward: 10   },
    ],
    edges: [
      { id: 'e1',  source: 'n1',  target: 'n2',  probability: null, isOptimal: false, type: 'probability' },
      { id: 'e2',  source: 'n1',  target: 'n3',  probability: null, isOptimal: false, type: 'probability' },
      { id: 'e3',  source: 'n2',  target: 'n4',  probability: 0.5,  isOptimal: false, type: 'probability' },
      { id: 'e4',  source: 'n2',  target: 'n5',  probability: 0.5,  isOptimal: false, type: 'probability' },
      { id: 'e5',  source: 'n3',  target: 'n6',  probability: 1.0,  isOptimal: false, type: 'probability' },
      { id: 'e6',  source: 'n4',  target: 'n7',  probability: null, isOptimal: false, type: 'probability' },
      { id: 'e7',  source: 'n4',  target: 'n8',  probability: null, isOptimal: false, type: 'probability' },
      { id: 'e8',  source: 'n7',  target: 'n9',  probability: 0.4,  isOptimal: false, type: 'probability' },
      { id: 'e9',  source: 'n7',  target: 'n10', probability: 0.6,  isOptimal: false, type: 'probability' },
      { id: 'e10', source: 'n8',  target: 'n11', probability: 0.6,  isOptimal: false, type: 'probability' },
      { id: 'e11', source: 'n8',  target: 'n12', probability: 0.4,  isOptimal: false, type: 'probability' },
    ],
  },
]
