import type { TivotAssistantPayload } from '@domain/value-objects/tivot-payload.vo'
import type { TivotConversationContext } from '@application/dto/tivot-conversation-context.dto'

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
