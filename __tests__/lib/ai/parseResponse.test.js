import { parseAIResponse } from '@/lib/ai/parseResponse'

describe('parseAIResponse', () => {
  it('parses valid raw JSON', () => {
    const raw = JSON.stringify({
      message: 'I built the graph.',
      operations: [{ op: 'add_node', type: 'state', label: 'Start' }],
    })
    const result = parseAIResponse(raw)
    expect(result.reply).toBe('I built the graph.')
    expect(result.operations).toHaveLength(1)
    expect(result.operations[0].label).toBe('Start')
  })

  it('strips markdown json fences', () => {
    const raw = '```json\n{"message":"ok","operations":[]}\n```'
    const result = parseAIResponse(raw)
    expect(result.reply).toBe('ok')
    expect(result.operations).toEqual([])
  })

  it('strips plain code fences', () => {
    const raw = '```\n{"message":"hello","operations":[{"op":"compute"}]}\n```'
    const result = parseAIResponse(raw)
    expect(result.reply).toBe('hello')
    expect(result.operations[0].op).toBe('compute')
  })

  it('returns fallback on malformed JSON', () => {
    const result = parseAIResponse('this is not json at all!!!')
    expect(result.operations).toEqual([])
    expect(result.reply).toContain("couldn't parse")
  })

  it('returns empty operations array when field missing', () => {
    const raw = JSON.stringify({ message: 'no ops here' })
    const result = parseAIResponse(raw)
    expect(result.reply).toBe('no ops here')
    expect(result.operations).toEqual([])
  })
})
