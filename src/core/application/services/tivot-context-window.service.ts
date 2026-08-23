import type { TivotConversationContext, TivotConversationMetadata } from '../dto/tivot-conversation-context.dto'
import type { TivotAssistantPayload, TivotUserPayload } from '@domain/value-objects/tivot-payload.vo'

const MAX_CONTEXT_TURNS = 3

export class TivotContextWindowService {
  appendTurn(
    context: TivotConversationContext,
    userPayload: TivotUserPayload,
    assistantPayload: TivotAssistantPayload,
  ): TivotConversationContext {
    const nextTurn = {
      user_message: this.summarizeUserPayload(userPayload),
      assistant_message: assistantPayload.message,
      assistant_type: assistantPayload.type,
      problem_id: assistantPayload.problem_id,
      metadata: assistantPayload.metadata,
      created_at: new Date().toISOString(),
    }

    return {
      metadata: this.resolveMetadata(context.metadata, userPayload, assistantPayload),
      turns: [...context.turns, nextTurn].slice(-MAX_CONTEXT_TURNS),
    }
  }

  private resolveMetadata(
    metadata: TivotConversationMetadata,
    userPayload: TivotUserPayload,
    assistantPayload: TivotAssistantPayload,
  ): TivotConversationMetadata {
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

  private summarizeUserPayload(userPayload: TivotUserPayload): string {
    if (userPayload.user_action === 'send_message') {
      return userPayload.message
    }

    return JSON.stringify({
      user_action: userPayload.user_action,
      problem_id: userPayload.problem_id,
      submitted_order: userPayload.submitted_order,
      user_comment: userPayload.user_comment ?? null,
    })
  }
}
