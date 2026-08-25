import { z } from 'zod'
import type { TivotAssistantPayload } from '@shared/types'
import { createStandardTextPayload } from '@shared/types'

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

const optionsSchema = z
  .array(z.string())
  .optional()
  .nullable()
  .transform((options) => cleanOptions(options))

const assistantPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('standard_text'),
    problem_id: z.string().nullable(),
    message: z.string().min(1),
    options: optionsSchema,
    flow_data: z.null(),
    metadata: metadataSchema,
  }),
  z.object({
    type: z.literal('interactive_flow'),
    problem_id: z.string().min(1),
    message: z.string().min(1),
    options: optionsSchema,
    flow_data: flowDataSchema,
    metadata: metadataSchema,
  }),
])

const spanishAssistantPayloadSchema = z.object({
  tipo: z.enum(['texto', 'flujo']),
  mensaje: z.string().min(1),
  cuadros: z.array(z.string().min(1)).nullable(),
  opciones: optionsSchema,
})

export const parseAssistantPayload = (rawContent: string): TivotAssistantPayload => {
  const jsonSource = extractJsonObject(rawContent)
  if (!jsonSource) return createFallbackPayload(rawContent)

  try {
    const parsed: unknown = JSON.parse(jsonSource)
    const result = assistantPayloadSchema.safeParse(parsed)
    if (result.success) return result.data

    const spanishResult = spanishAssistantPayloadSchema.safeParse(parsed)
    if (spanishResult.success) return normalizeSpanishPayload(spanishResult.data)

    return createFallbackPayload(rawContent)
  } catch {
    return createFallbackPayload(rawContent)
  }
}

const normalizeSpanishPayload = (payload: z.infer<typeof spanishAssistantPayloadSchema>): TivotAssistantPayload => {
  return createStandardTextPayload(payload.mensaje, {
    is_evaluation: false,
    passed: null,
    concept: 'Karel',
  }, null, payload.opciones)
}

const createFallbackPayload = (rawContent: string): TivotAssistantPayload =>
  createStandardTextPayload(cleanAssistantText(rawContent) || 'No pude leer la respuesta. Probemos con un ejemplo de Karel sencillo.', {
    is_evaluation: false,
    passed: null,
    concept: 'Karel',
  })

const cleanAssistantText = (rawContent: string): string => {
  const trimmed = rawContent.trim()
  const jsonSource = extractJsonObject(trimmed)
  if (!jsonSource) return trimmed

  try {
    const parsed: unknown = JSON.parse(jsonSource)
    if (!parsed || typeof parsed !== 'object') return trimmed

    const record = parsed as Record<string, unknown>
    const message = record.mensaje ?? record.message ?? record.respuesta ?? record.response
    if (typeof message === 'string' && message.trim().length > 0) return message.trim()
  } catch {
    return trimmed.replace(/^\{|\}$/g, '').replace(/"(tipo|mensaje|cuadros|opciones)"\s*:\s*/g, '').trim()
  }

  return trimmed
}

const cleanOptions = (options: string[] | null | undefined): string[] | null => {
  if (!Array.isArray(options)) return null

  const cleanedOptions = options
    .map((option) => option.trim())
    .filter((option, index, allOptions) => option.length > 0 && allOptions.indexOf(option) === index)
    .slice(0, 4)

  return cleanedOptions.length > 0 ? cleanedOptions : null
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
