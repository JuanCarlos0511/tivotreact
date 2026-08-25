import { useEffect, useRef, type KeyboardEvent } from 'react'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import type { KarelLevel, TivotChatSession } from '@shared/types'
import { ChatMessageItem } from './ChatMessageItem'

interface ChatWorkspaceProps {
  session: TivotChatSession | null
  activeLevel: KarelLevel
  query: string
  isResponding: boolean
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSelectQuickReply: (optionText: string) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
  onBackToLevels: () => void
}

export function ChatWorkspace({
  session,
  activeLevel,
  query,
  isResponding,
  onQueryChange,
  onSubmitMessage,
  onSelectQuickReply,
  onSubmitFlowOrder,
  onBackToLevels,
}: ChatWorkspaceProps) {
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const hasMessages = (session?.messages.length ?? 0) > 0
  const latestAssistantMessageId = [...(session?.messages ?? [])].reverse().find((message) => message.role === 'assistant')?.id

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [hasMessages, isResponding, session?.messages.length])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void onSubmitMessage()
    }
  }

  return (
    <section className="workspace">
      <div className="ambient-field" aria-hidden="true">
        <span className="node node-one" />
        <span className="node node-two" />
        <span className="node node-three" />
      </div>
      <div className={`conversation-stage ${hasMessages ? '' : 'conversation-stage-empty'}`}>
        <header className="conversation-header karel-workspace-header" aria-label="Nivel activo">
            <button
              className="workspace-back-button"
              type="button"
              aria-label="Volver a mapas"
              title="Volver a mapas"
              onClick={onBackToLevels}
            >
              <ArrowLeft size={16} />
              <span>Volver a Mapas</span>
            </button>
            <div className="workspace-level-copy">
              <span className="workspace-level-badge">Nivel {activeLevel.id}</span>
              <h1>{activeLevel.title.replace(/^Nivel \d+: /, '')}</h1>
            </div>
            <span className="model-status-pill">Karel Tutor</span>
          </header>
        {hasMessages && (
          <div className="messages-panel" aria-live="polite">
            {session?.messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onSubmitFlowOrder={onSubmitFlowOrder}
                onSelectQuickReply={(optionText) => void onSelectQuickReply(optionText)}
                isLatestAssistantMessage={message.id === latestAssistantMessageId}
                isLoading={isResponding}
              />
            ))}
            {isResponding && (
              <article className="message-row message-row-assistant">
                <div className="assistant-message-layout">
                  <div className="assistant-avatar assistant-avatar-loading" aria-hidden="true" />
                  <div className="message-bubble assistant-message message-loading">
                    <span>Karel esta revisando tu programa</span>
                    <span className="typing-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              </article>
            )}
            <div ref={messageEndRef} />
          </div>
        )}
        <div className="composer chat-composer">
          <textarea
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu duda o pega tu codigo Karel..."
            rows={2}
          />
          <button
            onClick={() => void onSubmitMessage()}
            className="send-button"
            type="button"
            aria-label="Enviar mensaje"
            disabled={isResponding || query.trim().length === 0}
          >
            {isResponding ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
          </button>
        </div>
      </div>
    </section>
  )
}
