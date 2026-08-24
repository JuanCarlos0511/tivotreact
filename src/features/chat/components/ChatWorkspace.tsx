import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import type { TivotChatSession } from '@shared/types'
import { ChatMessageItem } from './ChatMessageItem'
import { EmptyChatHero } from './EmptyChatHero'

interface ChatWorkspaceProps {
  session: TivotChatSession | null
  query: string
  isResponding: boolean
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
  onSelectStarterTopic: (prompt: string, problemId?: string) => Promise<void>
}

export function ChatWorkspace({
  session,
  query,
  isResponding,
  onQueryChange,
  onSubmitMessage,
  onSubmitFlowOrder,
  onSelectStarterTopic,
}: ChatWorkspaceProps) {
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const hasMessages = (session?.messages.length ?? 0) > 0

  useEffect(() => {
    if (!hasMessages) return
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [hasMessages, session?.messages.length])

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
        {hasMessages ? (
          <header className="conversation-header">
            <div>
              <p className="conversation-eyebrow">Tivot</p>
              <h1>{session?.title ?? 'Nueva mision'}</h1>
            </div>
          </header>
        ) : (
          <EmptyChatHero onSelectStarterTopic={onSelectStarterTopic} />
        )}
        {hasMessages && (
          <div className="messages-panel" aria-live="polite">
            {session?.messages.map((message) => (
              <ChatMessageItem key={message.id} message={message} onSubmitFlowOrder={onSubmitFlowOrder} />
            ))}
            {isResponding && (
              <article className="message-row message-row-assistant">
                <div className="message-bubble assistant-message message-loading">
                  <Loader2 className="spin" size={16} />
                  <span>Pensando una pista</span>
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
            placeholder="Escribe una mision para tu robot..."
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
