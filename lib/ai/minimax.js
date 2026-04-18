import { SYSTEM_PROMPT, buildUserMessage } from './prompt'
import { parseAIResponse } from './parseResponse'

/**
 * Call the Minimax AI API to get a graph-building response.
 * @param {Array<{role:string, content:string}>} messages - Full conversation history
 * @param {{ nodes: Array, edges: Array }} graph - Current graph state
 * @returns {Promise<{ reply: string, operations: Array }>}
 */
export async function callMinimax(messages, graph) {
  const lastMsg = messages[messages.length - 1]
  const priorMessages = messages.slice(0, -1)

  const body = {
    model: 'MiniMax-Text-01',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...priorMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: buildUserMessage(lastMsg.content, graph) },
    ],
    temperature: 0.3,
    max_completion_tokens: 2048,
  }

  const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MINIMAX_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Minimax API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content ?? ''
  return parseAIResponse(content)
}
