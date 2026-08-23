import { z } from 'zod'
import type { TivotAssistantPayload } from '@shared/types'

const metadataSchema = z.object({
  is_evaluation: z.boolean(),
  passed: z.boolean().nullable(),
  concept: z.string().min(1),
})

const flowNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const flowDataSchema = z.object({
  instruction: z.string().min(1),
  nodes: z.array(flowNodeSchema).min(4),
})

const assistantPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('standard_text'),
    problem_id: z.string().nullable(),
    message: z.string().min(1),
    flow_data: z.null(),
    metadata: metadataSchema,
  }),
  z.object({
    type: z.literal('interactive_flow'),
    problem_id: z.string().min(1),
    message: z.string().min(1),
    flow_data: flowDataSchema,
    metadata: metadataSchema,
  }),
])

export const parseAssistantPayload = (rawContent: string): TivotAssistantPayload | null => {
  const jsonSource = extractJsonObject(rawContent)
  if (!jsonSource) return null

  try {
    const parsed: unknown = JSON.parse(jsonSource)
    const result = assistantPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const extractJsonObject = (rawContent: string): string | null => {
  const trimmed = rawContent.trim()
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const source = fencedJson?.[1]?.trim() ?? trimmed

  if (source.startsWith('{') && source.endsWith('}')) {
    return source
  }

  return findBalancedJsonObject(source)
}

const findBalancedJsonObject = (source: string): string | null => {
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = inString
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') {
      if (depth === 0) start = index
      depth += 1
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        return source.slice(start, index + 1)
      }
    }
  }

  return null
}
