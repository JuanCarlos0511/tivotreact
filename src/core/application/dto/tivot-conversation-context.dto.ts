import type { TivotAssistantPayloadType, TivotPayloadMetadata } from '@domain/value-objects/tivot-payload.vo'

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
