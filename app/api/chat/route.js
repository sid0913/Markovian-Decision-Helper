import { callMinimax } from '@/lib/ai/minimax'
import { callClaude } from '@/lib/ai/claude'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { messages, graph, model } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages must be a non-empty array' }, { status: 400 })
  }

  if (!['minimax', 'claude'].includes(model)) {
    return Response.json({ error: 'model must be "minimax" or "claude"' }, { status: 400 })
  }

  try {
    const result = model === 'claude'
      ? await callClaude(messages, graph ?? { nodes: [], edges: [] })
      : await callMinimax(messages, graph ?? { nodes: [], edges: [] })

    return Response.json({ ...result, model })
  } catch (err) {
    console.error('Chat route error:', err)
    return Response.json(
      {
        reply: 'The AI request failed. Please check your API key or try again.',
        operations: [],
        model,
      },
      { status: 500 }
    )
  }
}
