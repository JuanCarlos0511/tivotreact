import type { TivotAssistantChatMessage, TivotChatMessage } from '../types'
import { MarkdownMessage } from './MarkdownMessage'
import { ReorderableFlow } from './ReorderableFlow'

interface ChatMessageItemProps {
  message: TivotChatMessage
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
}

const renderAssistantContent = (
  message: TivotAssistantChatMessage,
  onSubmitFlowOrder: ChatMessageItemProps['onSubmitFlowOrder'],
) => (
  <>
    <div className="message-bubble assistant-message">
      <MarkdownMessage text={message.payload.message} />
      <span className="message-concept">{message.payload.metadata.concept}</span>
    </div>
    {message.payload.type === 'interactive_flow' &&
      (() => {
        const flowPayload = message.payload
        return (
          <ReorderableFlow
            payload={flowPayload}
            submission={message.submission}
            onSubmit={(submittedOrder) => onSubmitFlowOrder(message.id, flowPayload.problem_id, submittedOrder)}
          />
        )
      })()}
  </>
)

export function ChatMessageItem({ message, onSubmitFlowOrder }: ChatMessageItemProps) {
  if (message.role === 'user') {
    return (
      <article className="message-row message-row-user">
        <div className="message-bubble user-message">
          <MarkdownMessage text={message.content} />
        </div>
      </article>
    )
  }

  return (
    <article className="message-row message-row-assistant">
      {renderAssistantContent(message, onSubmitFlowOrder)}
    </article>
  )
}
