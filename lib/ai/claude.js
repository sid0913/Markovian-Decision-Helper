import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'
import { parseAIResponse } from './parseResponse'

/**
 * Call the Anthropic Claude API to get a graph-building response.
 * @param {Array<{role:string, content:string}>} messages - Full conversation history
 * @param {{ nodes: Array, edges: Array }} graph - Current graph state
 * @returns {Promise<{ reply: string, operations: Array }>}
 */
export async function callClaude(messages, graph) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })

  const lastMsg = messages[messages.length - 1]
  const priorMessages = messages.slice(0, -1)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      ...priorMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: buildUserMessage(lastMsg.content, graph) },
    ],
  })

  const content = response.content?.[0]?.text ?? ''
  return parseAIResponse(content)
}
