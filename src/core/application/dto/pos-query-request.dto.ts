import type { TivotUserPayload } from '@domain/value-objects/tivot-payload.vo'
import type { TivotConversationContext } from './tivot-conversation-context.dto'

export interface PosQueryRequest {
  sessionId: string
  userPayload: TivotUserPayload
  context: TivotConversationContext
}
