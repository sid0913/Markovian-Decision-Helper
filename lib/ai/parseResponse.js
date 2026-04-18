/**
 * Parse an AI model response that should contain a JSON object with
 * { message, operations } fields. Handles markdown code fence wrapping.
 * @param {string} rawText
 * @returns {{ reply: string, operations: Array }}
 */
export function parseAIResponse(rawText) {
  try {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    return {
      reply: typeof parsed.message === 'string' ? parsed.message : 'Done.',
      operations: Array.isArray(parsed.operations) ? parsed.operations : [],
    }
  } catch {
    return {
      reply: "I couldn't parse the response. Please try rephrasing your request.",
      operations: [],
    }
  }
}
