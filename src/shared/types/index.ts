export * from './utility.types'

export interface AiProvider {
  complete(prompt: string, messages?: AiChatMessage[]): Promise<string>
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type TivotAssistantPayloadType = 'standard_text' | 'interactive_flow'

export interface TivotFlowNode {
  id: string
  label: string
}

export interface TivotFlowData {
  instruction: string
  nodes: TivotFlowNode[]
}

export interface TivotPayloadMetadata {
  is_evaluation: boolean
  passed: boolean | null
  concept: string
}

interface TivotAssistantPayloadBase {
  type: TivotAssistantPayloadType
  problem_id: string | null
  message: string
  options: string[] | null
  flow_data: TivotFlowData | null
  metadata: TivotPayloadMetadata
}

export interface TivotStandardTextPayload extends TivotAssistantPayloadBase {
  type: 'standard_text'
  flow_data: null
}

export interface TivotInteractiveFlowPayload extends TivotAssistantPayloadBase {
  type: 'interactive_flow'
  problem_id: string
  flow_data: TivotFlowData
}

export type TivotAssistantPayload = TivotStandardTextPayload | TivotInteractiveFlowPayload

export interface TivotTextUserPayload {
  user_action: 'send_message'
  message: string
}

export interface TivotSubmitFlowOrderPayload {
  user_action: 'submit_flow_order'
  problem_id: string
  submitted_order: string[]
  user_comment?: string
}

export type TivotUserPayload = TivotTextUserPayload | TivotSubmitFlowOrderPayload

export const createStandardTextPayload = (
  message: string,
  metadata: TivotPayloadMetadata,
  problemId: string | null = null,
  options: string[] | null = null,
): TivotStandardTextPayload => ({
  type: 'standard_text',
  problem_id: problemId,
  message,
  options,
  flow_data: null,
  metadata,
})

export type TivotProblemMode = 'standard_text' | 'interactive_flow'
export type TivotProblemDifficulty = 'Junior' | 'Mid' | 'Senior' | 'Staff'

interface TivotProblemBase {
  problem_id: string
  mode: TivotProblemMode
  title: string
  difficulty: TivotProblemDifficulty
  tags: string[]
  system_context: string
}

export interface TivotStandardTextProblem extends TivotProblemBase {
  mode: 'standard_text'
  evaluation_criteria: string
}

export interface TivotFlowDefinition {
  instruction: string
  nodes: TivotFlowNode[]
  valid_orders: string[][]
}

export interface TivotInteractiveFlowProblem extends TivotProblemBase {
  mode: 'interactive_flow'
  flow_definition: TivotFlowDefinition
  failure_hints: Record<string, string>
}

export type TivotProblem = TivotStandardTextProblem | TivotInteractiveFlowProblem

export const isInteractiveFlowProblem = (problem: TivotProblem): problem is TivotInteractiveFlowProblem =>
  problem.mode === 'interactive_flow'

export interface TivotConversationMetadata {
  active_problem_id: string | null
  attempt_count: number
}

export interface TivotConversationTurn {
  user_message: string
  assistant_message: string
  assistant_type: TivotAssistantPayloadType
  problem_id: string | null
  metadata: TivotPayloadMetadata
  created_at: string
}

export interface TivotConversationContext {
  metadata: TivotConversationMetadata
  turns: TivotConversationTurn[]
}

export const createEmptyTivotConversationContext = (
  activeProblemId: string | null = null,
): TivotConversationContext => ({
  metadata: {
    active_problem_id: activeProblemId,
    attempt_count: 0,
  },
  turns: [],
})

export type FlowWidgetStatus = 'DRAFT' | 'SUBMITTING' | 'LOCKED'

export interface FlowSubmissionState {
  status: FlowWidgetStatus
  submittedOrder: string[]
  feedback: TivotAssistantPayload | null
  llmInvoked: boolean
}

export interface TivotUserChatMessage {
  id: string
  role: 'user'
  content: string
  createdAt: string
}

export interface TivotAssistantChatMessage {
  id: string
  role: 'assistant'
  payload: TivotAssistantPayload
  submission: FlowSubmissionState | null
  createdAt: string
}

export type TivotChatMessage = TivotUserChatMessage | TivotAssistantChatMessage

export interface TivotChatSession {
  id: string
  title: string
  context: TivotConversationContext
  messages: TivotChatMessage[]
}

export interface TivotResponse {
  payload: TivotAssistantPayload
  context: TivotConversationContext
  rawAnswer: string | null
  algorithmUsed: boolean
  llmInvoked: boolean
}

export type StarterTopicIcon = 'robot' | 'repeat' | 'decision' | 'bug'

export interface TivotStarterTopic {
  id: string
  title: string
  description: string
  prompt: string
  problemId?: string
  icon: StarterTopicIcon
}

export type KarelGridPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type KarelDirection = 'norte' | 'sur' | 'este' | 'oeste'

export interface KarelWorldPoint {
  avenue: number | null
  street: number
}

export interface KarelWorld {
  start: KarelWorldPoint & {
    direction: KarelDirection
  }
  goal: KarelWorldPoint
  beepers: ReadonlyArray<KarelWorldPoint & { count: number }>
  walls: readonly string[]
  backpack?: number
}

export interface KarelLevel {
  id: number
  title: string
  description: string
  gridPosition: KarelGridPosition
  commands: readonly string[]
  world: KarelWorld
  initialMessage: string
}
