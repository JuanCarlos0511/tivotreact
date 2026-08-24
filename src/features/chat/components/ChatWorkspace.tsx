import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Loader2, PanelLeft, PanelRight, Send } from 'lucide-react'
import type { TivotChatSession } from '@shared/types'
import { ChatMessageItem } from './ChatMessageItem'
import { EmptyChatHero } from './EmptyChatHero'

interface ChatWorkspaceProps {
  session: TivotChatSession | null
  query: string
  isResponding: boolean
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSelectQuickReply: (optionText: string) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
  onSelectStarterTopic: (prompt: string, problemId?: string) => Promise<void>
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export function ChatWorkspace({
  session,
  query,
  isResponding,
  onQueryChange,
  onSubmitMessage,
  onSelectQuickReply,
  onSubmitFlowOrder,
  onSelectStarterTopic,
  isSidebarOpen,
  onToggleSidebar,
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
        {hasMessages ? (
          <header className="conversation-header" aria-label="Conversacion activa">
            <button
              className="workspace-sidebar-toggle"
              type="button"
              aria-label={isSidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
              title={isSidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
              onClick={onToggleSidebar}
            >
              {isSidebarOpen ? <PanelLeft size={16} /> : <PanelRight size={16} />}
            </button>
            <h1>{session?.title ?? 'Nueva conversacion'}</h1>
            <span className="model-status-pill">Qwen Plus • Modo Tutor</span>
          </header>
        ) : (
          <EmptyChatHero onSelectStarterTopic={onSelectStarterTopic} />
        )}
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
                    <span>Tivot esta preparando tu reto</span>
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
            placeholder="Escribe tu duda de programacion..."
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
