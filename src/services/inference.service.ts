import type {
  AiChatMessage,
  KarelLevel,
  TivotAssistantPayload,
  TivotChatMessage,
  TivotConversationContext,
  TivotConversationMetadata,
  TivotInteractiveFlowProblem,
  TivotProblem,
  TivotResponse,
  TivotStandardTextPayload,
  TivotUserPayload,
} from '@shared/types'
import { KAREL_SYSTEM_PROMPT, buildConversationPrompt, buildKarelLevelContext } from '@shared/prompts'
import { createStandardTextPayload, isInteractiveFlowProblem } from '@shared/types'
import { env } from '@config/env'
import { createAiProvider } from './ai'
import { parseAssistantPayload } from './parser.service'

const MAX_CONTEXT_TURNS = 3
const MAX_CONTEXT_MESSAGES = 6

interface ProcessUserActionInput {
  userPayload: TivotUserPayload
  context: TivotConversationContext
  conversationHistory?: TivotChatMessage[]
  catalog?: TivotProblem[]
  activeLevel?: KarelLevel | null
}

interface InferenceResult {
  payload: TivotAssistantPayload
  rawAnswer: string | null
  llmInvoked: boolean
}

interface FailedFlowEvaluation {
  passed: false
  problem: TivotInteractiveFlowProblem
  violatedRule: string
  fallbackPayload: TivotStandardTextPayload
}

interface PassedFlowEvaluation {
  passed: true
  problem: TivotInteractiveFlowProblem
  fallbackPayload: TivotStandardTextPayload
}

type FlowEvaluationResult = FailedFlowEvaluation | PassedFlowEvaluation

export const processTivotUserAction = async ({
  userPayload,
  context,
  conversationHistory,
  catalog = [],
  activeLevel = null,
}: ProcessUserActionInput): Promise<TivotResponse> => {
  const result = await resolvePayload(userPayload, context, catalog, conversationHistory, activeLevel)

  return {
    ...result,
    context: appendTurn(context, userPayload, result.payload),
  }
}

const resolvePayload = async (
  userPayload: TivotUserPayload,
  context: TivotConversationContext,
  catalog: TivotProblem[],
  conversationHistory?: TivotChatMessage[],
  activeLevel: KarelLevel | null = null,
): Promise<Omit<TivotResponse, 'context'>> => {
  if (userPayload.user_action === 'submit_flow_order') {
    return resolveFlowSubmission(userPayload.problem_id, userPayload.submitted_order, catalog)
  }

  const inferenceResult = await answerConversation(userPayload.message, context, conversationHistory, activeLevel)

  return {
    ...inferenceResult,
    algorithmUsed: false,
  }
}

const resolveFlowSubmission = async (
  problemId: string,
  submittedOrder: string[],
  catalog: TivotProblem[],
): Promise<Omit<TivotResponse, 'context'>> => {
  const evaluation = evaluateFlowOrder(problemId, submittedOrder, catalog)

  if (!evaluation) {
    return {
      payload: createStandardTextPayload(
        'No encuentro esa mision. Elige una tarjeta y armamos los pasos juntos.',
        {
          is_evaluation: true,
          passed: false,
          concept: 'Misiones',
        },
      ),
      rawAnswer: null,
      algorithmUsed: true,
      llmInvoked: false,
    }
  }

  if (evaluation.passed) {
    return {
      payload: evaluation.fallbackPayload,
      rawAnswer: null,
      algorithmUsed: true,
      llmInvoked: false,
    }
  }

  const inferenceResult = await answerFlowFailure(
    evaluation.problem,
    submittedOrder,
    evaluation.violatedRule,
    evaluation.fallbackPayload,
  )

  return {
    ...inferenceResult,
    algorithmUsed: true,
  }
}

const answerConversation = async (
  query: string,
  context: TivotConversationContext,
  conversationHistory?: TivotChatMessage[],
  activeLevel: KarelLevel | null = null,
): Promise<InferenceResult> => {
  return completeWithFallback(
    buildConversationPrompt(query, activeLevel),
    createAiUnavailablePayload(),
    buildCleanChatMessages(query, context, conversationHistory, activeLevel),
  )
}

const answerFlowFailure = async (
  problem: TivotInteractiveFlowProblem,
  submittedOrder: string[],
  violatedRule: string,
  fallbackPayload: TivotAssistantPayload,
): Promise<InferenceResult> =>
  completeWithFallback(
    [
      KAREL_SYSTEM_PROMPT,
      '',
      'Genera una pista socratica de maximo 80 palabras para un orden incorrecto.',
      'No reveles el orden correcto completo.',
      'Devuelve solo el JSON del formato estricto con tipo="texto" y cuadros=null.',
      '',
      `PROBLEMA: ${problem.problem_id} - ${problem.title}`,
      `REGLA_INFRINGIDA: ${violatedRule}`,
      `ORDEN_ENVIADO: ${JSON.stringify(submittedOrder)}`,
    ].join('\n'),
    fallbackPayload,
  )

const completeWithFallback = async (
  prompt: string,
  fallbackPayload: TivotAssistantPayload,
  messages?: AiChatMessage[],
): Promise<InferenceResult> => {
  try {
    console.warn('[Tivot Inference] Proveedor activo:', env.VITE_AI_PROVIDER)
    const rawAnswer = await createAiProvider().complete(prompt, messages)

    return {
      payload: parseAssistantPayload(rawAnswer),
      rawAnswer,
      llmInvoked: true,
    }
  } catch (error) {
    console.error('[Tivot Inference] Error del proveedor IA:', error)
    return {
      payload: fallbackPayload,
      rawAnswer: null,
      llmInvoked: false,
    }
  }
}

const buildCleanChatMessages = (
  query: string,
  context: TivotConversationContext,
  conversationHistory?: TivotChatMessage[],
  activeLevel: KarelLevel | null = null,
): AiChatMessage[] => {
  const historyMessages = conversationHistory?.flatMap(cleanChatMessage) ?? []
  const contextMessages = context.turns.flatMap(cleanTurnMessages)
  const cleanHistory = removeTrailingCurrentUserMessage(
    historyMessages.length > 0 ? historyMessages : contextMessages,
    query,
  )

  return [
    { role: 'system', content: `${KAREL_SYSTEM_PROMPT}\n\n${buildKarelLevelContext(activeLevel)}` },
    ...cleanHistory.slice(-MAX_CONTEXT_MESSAGES),
    { role: 'user', content: query },
  ]
}

const removeTrailingCurrentUserMessage = (messages: AiChatMessage[], query: string): AiChatMessage[] => {
  const lastMessage = messages.at(-1)
  if (lastMessage?.role === 'user' && normalizeText(lastMessage.content) === normalizeText(query)) {
    return messages.slice(0, -1)
  }

  return messages
}

const cleanChatMessage = (message: TivotChatMessage): AiChatMessage[] => {
  if (message.role === 'user') {
    return [{ role: 'user', content: cleanText(message.content) }]
  }

  return [{ role: 'assistant', content: cleanText(message.payload.message) }]
}

const cleanTurnMessages = (turn: TivotConversationContext['turns'][number]): AiChatMessage[] => [
  { role: 'user', content: cleanText(turn.user_message) },
  { role: 'assistant', content: cleanText(turn.assistant_message) },
]

const cleanText = (text: string): string => extractMessageFromJson(text).replace(/\s+/g, ' ').trim()

const normalizeText = (text: string): string => cleanText(text).toLowerCase()

const extractMessageFromJson = (text: string): string => {
  const trimmedText = text.trim()
  if (!trimmedText.startsWith('{')) return text

  try {
    const parsed: unknown = JSON.parse(trimmedText)
    if (!parsed || typeof parsed !== 'object') return text

    const record = parsed as Record<string, unknown>
    const message = record.mensaje ?? record.message
    return typeof message === 'string' && message.trim().length > 0 ? message : text
  } catch {
    return text
  }
}

const createAiUnavailablePayload = (): TivotAssistantPayload =>
  createStandardTextPayload(
    'No pude conectar con Qwen. Revisa VITE_QWEN_API_KEY, VITE_QWEN_BASE_URL y reinicia el servidor de desarrollo para cargar el .env.',
    {
      is_evaluation: false,
      passed: null,
      concept: 'Error de conexion IA',
    },
  )

const evaluateFlowOrder = (
  problemId: string,
  submittedOrder: string[],
  catalog: TivotProblem[],
): FlowEvaluationResult | null => {
  const problem = catalog.find(
    (candidate): candidate is TivotInteractiveFlowProblem =>
      candidate.problem_id === problemId && isInteractiveFlowProblem(candidate),
  )

  if (!problem) return null

  const passed = problem.flow_definition.valid_orders.some((validOrder) =>
    sameOrder(validOrder, submittedOrder),
  )

  if (passed) {
    return {
      passed: true,
      problem,
      fallbackPayload: createPassedPayload(problem),
    }
  }

  const failure = findFailureHint(problem, submittedOrder)

  return {
    passed: false,
    problem,
    violatedRule: failure.violatedRule,
    fallbackPayload: createFailedPayload(problem, failure.hint),
  }
}

const appendTurn = (
  context: TivotConversationContext,
  userPayload: TivotUserPayload,
  assistantPayload: TivotAssistantPayload,
): TivotConversationContext => {
  const nextTurn = {
    user_message: summarizeUserPayload(userPayload),
    assistant_message: assistantPayload.message,
    assistant_type: assistantPayload.type,
    problem_id: assistantPayload.problem_id,
    metadata: assistantPayload.metadata,
    created_at: new Date().toISOString(),
  }

  return {
    metadata: resolveMetadata(context.metadata, userPayload, assistantPayload),
    turns: [...context.turns, nextTurn].slice(-MAX_CONTEXT_TURNS),
  }
}

const resolveMetadata = (
  metadata: TivotConversationMetadata,
  userPayload: TivotUserPayload,
  assistantPayload: TivotAssistantPayload,
): TivotConversationMetadata => {
  if (userPayload.user_action === 'submit_flow_order') {
    return {
      active_problem_id: assistantPayload.metadata.passed ? null : userPayload.problem_id,
      attempt_count: assistantPayload.metadata.passed ? 0 : metadata.attempt_count + 1,
    }
  }

  return {
    active_problem_id: assistantPayload.problem_id,
    attempt_count: 0,
  }
}

const summarizeUserPayload = (userPayload: TivotUserPayload): string => {
  if (userPayload.user_action === 'send_message') {
    return userPayload.message
  }

  const comment = userPayload.user_comment ? ` Comentario: ${userPayload.user_comment}` : ''
  return `El estudiante ordeno los cuadros asi: ${userPayload.submitted_order.join(', ')}.${comment}`
}

const sameOrder = (validOrder: string[], submittedOrder: string[]): boolean =>
  validOrder.length === submittedOrder.length && validOrder.every((nodeId, index) => nodeId === submittedOrder[index])

const findFailureHint = (
  problem: TivotInteractiveFlowProblem,
  submittedOrder: string[],
): { violatedRule: string; hint: string } => {
  for (const [rule, hint] of Object.entries(problem.failure_hints)) {
    const parsedRule = rule.match(/^(.+)_before_(.+)$/)
    const beforeNode = parsedRule?.[1]
    const afterNode = parsedRule?.[2]
    if (!beforeNode || !afterNode) continue

    const beforeIndex = submittedOrder.indexOf(beforeNode)
    const afterIndex = submittedOrder.indexOf(afterNode)
    if (beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex) {
      return { violatedRule: rule, hint }
    }
  }

  const firstValidOrder = problem.flow_definition.valid_orders[0] ?? problem.flow_definition.nodes.map((node) => node.id)
  const firstMismatchIndex = firstValidOrder.findIndex((nodeId, index) => submittedOrder[index] !== nodeId)
  const violatedRule = firstMismatchIndex >= 0 ? `expected_${firstValidOrder[firstMismatchIndex]}_at_${firstMismatchIndex + 1}` : 'unknown_order'

  return {
    violatedRule,
    hint: 'Si fueras el robot, que paso necesitas entender antes de hacer este?',
  }
}

const createPassedPayload = (problem: TivotInteractiveFlowProblem): TivotStandardTextPayload =>
  createStandardTextPayload(
    'Muy bien. Tu robot pudo seguir la mision porque cada paso llego en el momento correcto.',
    {
      is_evaluation: true,
      passed: true,
      concept: problem.tags[0] ?? 'Algoritmos',
    },
    problem.problem_id,
  )

const createFailedPayload = (
  problem: TivotInteractiveFlowProblem,
  hint: string,
): TivotStandardTextPayload =>
  createStandardTextPayload(
    hint,
    {
      is_evaluation: true,
      passed: false,
      concept: problem.tags[0] ?? 'Algoritmos',
    },
    problem.problem_id,
  )
