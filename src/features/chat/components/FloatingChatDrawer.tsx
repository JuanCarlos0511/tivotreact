import { type KeyboardEvent, useEffect, useRef } from 'react'
import { Loader2, MessageCircle, Send, X } from 'lucide-react'
import type { TivotChatSession } from '@shared/types'
import { ChatMessageItem } from './ChatMessageItem'

interface FloatingChatDrawerProps {
  session: TivotChatSession | null
  query: string
  isResponding: boolean
  isOpen: boolean
  objective: string
  showObjective: boolean
  isIntroPrompt: boolean
  onContinueIntro?: () => void
  onDismissIntro?: () => void
  onOpen: () => void
  onClose: () => void
  onDismissObjective: () => void
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSelectQuickReply: (optionText: string) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
}

export function FloatingChatDrawer({
  session,
  query,
  isResponding,
  isOpen,
  objective,
  showObjective,
  isIntroPrompt,
  onContinueIntro,
  onDismissIntro,
  onOpen,
  onClose,
  onDismissObjective,
  onQueryChange,
  onSubmitMessage,
  onSelectQuickReply,
  onSubmitFlowOrder,
}: FloatingChatDrawerProps) {
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const latestAssistantMessageId = [...(session?.messages ?? [])].reverse().find((message) => message.role === 'assistant')?.id
  const showIntroAttention = isIntroPrompt && showObjective && !isOpen

  const handleDismissPrompt = () => {
    if (isIntroPrompt && onDismissIntro) {
      onDismissIntro()
      return
    }

    onDismissObjective()
  }

  useEffect(() => {
    if (!isOpen) return
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [isOpen, isResponding, session?.messages.length])

  const handleOpen = () => {
    handleDismissPrompt()
    onOpen()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void onSubmitMessage()
    }
  }

  return (
    <>
      <div className="floating-chat-anchor">
        {showObjective && !isOpen && (
          <aside className={`objective-popover ${isIntroPrompt ? 'tivot-intro-popover' : ''}`} role="status">
            <button type="button" aria-label="Cerrar objetivo" onClick={handleDismissPrompt}>
              <X size={13} />
            </button>
            {isIntroPrompt && <strong>Tutorial inicial</strong>}
            <p>{objective}</p>
            {isIntroPrompt && onContinueIntro && (
              <div className="tutorial-popover-actions">
                <button className="tutorial-skip-button" type="button" onClick={handleDismissPrompt}>
                  Omitir
                </button>
                <button className="tutorial-next-button" type="button" onClick={onContinueIntro}>
                  Siguiente
                </button>
              </div>
            )}
          </aside>
        )}
        <button
          className={`floating-chat-button ${showIntroAttention ? 'floating-chat-button-attention' : ''}`}
          type="button"
          onClick={handleOpen}
          aria-label="Abrir chat tutor"
        >
          <MessageCircle size={22} />
          <span className="chat-pulse-badge" aria-hidden="true" />
        </button>
      </div>
      {isOpen && (
        <div className="floating-chat-overlay" role="dialog" aria-modal="true" aria-label="Chat tutor de Karel">
          <section className="floating-chat-drawer">
            <header className="floating-chat-header">
              <div>
                <span>Tutor IA</span>
                <strong>Karel el Robot</strong>
              </div>
              <button type="button" aria-label="Minimizar chat" onClick={onClose}>
                <X size={17} />
              </button>
            </header>
            <div className="floating-chat-messages" aria-live="polite">
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
                      <span>Karel esta revisando tu pregunta</span>
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
            <div className="composer floating-chat-composer">
              <textarea
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre tu codigo..."
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
          </section>
        </div>
      )}
    </>
  )
}
