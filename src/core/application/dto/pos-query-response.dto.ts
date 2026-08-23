import type { TivotAssistantPayload } from '@domain/value-objects/tivot-payload.vo'
import type { TivotConversationContext } from './tivot-conversation-context.dto'

export interface PosQueryResponse {
  payload: TivotAssistantPayload
  context: TivotConversationContext
  rawAnswer: string | null
  algorithmUsed: boolean
  llmInvoked: boolean
}
