/**
 * Parse an AI model response that should contain a JSON object with
 * { message, operations } fields. Handles markdown code fence wrapping
 * and extracts JSON from responses that contain surrounding prose.
 * @param {string} rawText
 * @returns {{ reply: string, operations: Array }}
 */
export function parseAIResponse(rawText) {
  const tryParse = (text) => {
    try {
      const parsed = JSON.parse(text)
      return {
        reply: typeof parsed.message === 'string' ? parsed.message : 'Done.',
        operations: Array.isArray(parsed.operations) ? parsed.operations : [],
      }
    } catch { return null }
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Fast path: well-formed JSON
  const fast = tryParse(cleaned)
  if (fast) return fast

  // Slow path: extract outermost {...} block (handles surrounding prose)
  const match = rawText.match(/\{[\s\S]*\}/)
  if (match) {
    const extracted = tryParse(match[0])
    if (extracted) return extracted
  }

  return {
    reply: "I couldn't parse the response. Please try rephrasing your request.",
    operations: [],
  }
}
