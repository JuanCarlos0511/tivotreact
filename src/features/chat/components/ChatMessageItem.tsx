import { Zap } from 'lucide-react'
import type { TivotAssistantChatMessage, TivotChatMessage } from '@shared/types'
import tivotIcon from '@/assets/tivot_icon.png'
import { MarkdownMessage } from './MarkdownMessage'
import { ReorderableFlow } from './ReorderableFlow'

interface ChatMessageItemProps {
  message: TivotChatMessage
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
  onSelectQuickReply?: (optionText: string) => void
  onApplySuggestedCode?: (suggestedCode: string[]) => void
  isLatestAssistantMessage?: boolean
  isLoading?: boolean
}

const renderAssistantContent = (
  message: TivotAssistantChatMessage,
  onSubmitFlowOrder: ChatMessageItemProps['onSubmitFlowOrder'],
  onSelectQuickReply: ChatMessageItemProps['onSelectQuickReply'],
  onApplySuggestedCode: ChatMessageItemProps['onApplySuggestedCode'],
  isLatestAssistantMessage: boolean,
  isLoading: boolean,
) => (
  <>
    <div className="assistant-message-layout">
      <img className="assistant-avatar" src={tivotIcon} alt="" aria-hidden="true" />
      <div className="message-bubble assistant-message">
        <MarkdownMessage text={message.payload.message} />
        {message.payload.suggestsCode && message.payload.suggestedCode && (
          <div className="suggested-code-card">
            <pre aria-label="Código sugerido">
              <code>{message.payload.suggestedCode.join('\n')}</code>
            </pre>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onApplySuggestedCode?.(message.payload.suggestedCode ?? [])}
            >
              <Zap size={15} aria-hidden="true" />
              Probar código
            </button>
          </div>
        )}
        {message.payload.options && (
          <div className="quick-reply-list" aria-label="Respuestas rapidas">
            {message.payload.options.map((option) => {
              const isDisabled = !isLatestAssistantMessage || isLoading

              return (
                <button
                  key={option}
                  className="quick-reply-chip"
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectQuickReply?.(option)}
                >
                  {option}
                </button>
              )
            })}
          </div>
        )}
        <span className="message-concept">{message.payload.metadata.concept}</span>
      </div>
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

export function ChatMessageItem({
  message,
  onSubmitFlowOrder,
  onSelectQuickReply,
  onApplySuggestedCode,
  isLatestAssistantMessage = false,
  isLoading = false,
}: ChatMessageItemProps) {
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
      {renderAssistantContent(message, onSubmitFlowOrder, onSelectQuickReply, onApplySuggestedCode, isLatestAssistantMessage, isLoading)}
    </article>
  )
}
