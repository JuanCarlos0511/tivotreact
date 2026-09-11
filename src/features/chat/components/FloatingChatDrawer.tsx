import { type CSSProperties, type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, RotateCcw, Send, X } from 'lucide-react'
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
  onApplySuggestedCode: (suggestedCode: string[]) => void
  onResetConversation: () => void
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
  onApplySuggestedCode,
  onResetConversation,
}: FloatingChatDrawerProps) {
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const [isComposerFocused, setIsComposerFocused] = useState(false)
  const [keyboardViewport, setKeyboardViewport] = useState<{ height: number; offsetTop: number } | null>(null)
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

  useEffect(() => {
    if (!isOpen || !isComposerFocused || !window.visualViewport) {
      setKeyboardViewport(null)
      return
    }

    const viewport = window.visualViewport
    const updateViewport = () => setKeyboardViewport({ height: viewport.height, offsetTop: viewport.offsetTop })
    updateViewport()
    viewport.addEventListener('resize', updateViewport)
    viewport.addEventListener('scroll', updateViewport)
    return () => {
      viewport.removeEventListener('resize', updateViewport)
      viewport.removeEventListener('scroll', updateViewport)
    }
  }, [isOpen, isComposerFocused])

  const handleComposerBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.parentElement?.contains(event.relatedTarget)) return
    setIsComposerFocused(false)
  }

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
          className={`floating-chat-button ${showIntroAttention ? 'floating-chat-button-attention' : ''} ${isOpen ? 'is-open' : ''}`}
          type="button"
          onClick={isOpen ? onClose : handleOpen}
          aria-label={isOpen ? 'Cerrar chat tutor' : 'Abrir chat tutor'}
          aria-expanded={isOpen}
        >
          <MessageCircle size={22} />
          <span className="chat-pulse-badge" aria-hidden="true" />
        </button>
      </div>
      {isOpen && (
          <section
            className={`workspace-chat-panel ${isComposerFocused ? 'chat-keyboard-open' : ''}`}
            style={keyboardViewport ? {
              '--chat-keyboard-height': `${keyboardViewport.height}px`,
              '--chat-keyboard-top': `${keyboardViewport.offsetTop}px`,
            } as CSSProperties : undefined}
            aria-label="Chat tutor de Karel"
          >
            <header className="floating-chat-header">
              <div>
                <span>Tutor IA</span>
                <strong>Tivot</strong>
              </div>
              <div className="floating-chat-header-actions">
                <button
                  type="button"
                  aria-label="Reiniciar conversación de este nivel"
                  title="Reiniciar conversación de este nivel"
                  disabled={isResponding}
                  onClick={onResetConversation}
                >
                  <RotateCcw size={15} />
                </button>
                <button type="button" aria-label="Minimizar chat" onClick={onClose}>
                  <X size={17} />
                </button>
              </div>
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
                  onApplySuggestedCode={onApplySuggestedCode}
                />
              ))}
              {isResponding && (
                <article className="message-row message-row-assistant">
                  <div className="assistant-message-layout">
                    <div className="assistant-avatar assistant-avatar-loading" aria-hidden="true" />
                    <div className="message-bubble assistant-message message-loading">
                      <span>Tivot está revisando tu pregunta</span>
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
                onFocus={() => setIsComposerFocused(true)}
                onBlur={handleComposerBlur}
                aria-describedby="chat-privacy-notice"
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
            <p id="chat-privacy-notice" className="chat-privacy-notice">
              El chat es anónimo para fines de investigación académica. Por favor, no compartas datos personales, nombres ni información sensible.
            </p>
          </section>
      )}
    </>
  )
}
