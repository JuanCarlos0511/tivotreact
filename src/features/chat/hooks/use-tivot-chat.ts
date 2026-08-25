import { useEffect, useMemo, useState } from 'react'
import type {
  FlowSubmissionState,
  KarelLevel,
  TivotAssistantChatMessage,
  TivotAssistantPayload,
  TivotChatSession,
} from '@shared/types'
import { createEmptyTivotConversationContext, createStandardTextPayload } from '@shared/types'
import { processTivotUserAction } from '@services/inference.service'

const createMessageId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

const createAssistantMessage = (payload: TivotAssistantPayload): TivotAssistantChatMessage => ({
  id: createMessageId('assistant'),
  role: 'assistant',
  payload,
  submission: null,
  createdAt: new Date().toISOString(),
})

const createUserMessage = (content: string) => ({
  id: createMessageId('user'),
  role: 'user' as const,
  content,
  createdAt: new Date().toISOString(),
})

const createSessionTitle = (prompt: string): string => {
  const normalizedPrompt = prompt.trim().toLowerCase()
  if (/^(hola|hello|hi|buenas|hey)[!.?¡¿\s]*$/.test(normalizedPrompt)) {
    return 'Conversacion con Karel'
  }

  return prompt.slice(0, 48)
}

const createLevelSessionId = (levelId: number) => `karel-level-${levelId}`

const createInitialLevelMessage = (level: KarelLevel): TivotAssistantChatMessage =>
  createAssistantMessage(
    createStandardTextPayload(
      `Objetivo del mapa: ${level.objective}\n\n${level.initialMessage}`,
      {
        is_evaluation: false,
        passed: null,
        concept: level.title,
      },
    ),
  )

const createLevelSession = (level: KarelLevel): TivotChatSession => ({
  id: createLevelSessionId(level.id),
  title: level.title,
  context: createEmptyTivotConversationContext(),
  messages: [createInitialLevelMessage(level)],
})

export const useTivotChat = (activeLevel: KarelLevel | null) => {
  const [sessions, setSessions] = useState<TivotChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [isResponding, setIsResponding] = useState(false)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [activeSessionId, sessions],
  )

  useEffect(() => {
    if (!activeLevel) return

    const sessionId = createLevelSessionId(activeLevel.id)
    setSessions((currentSessions) => {
      if (currentSessions.some((session) => session.id === sessionId)) return currentSessions
      return [createLevelSession(activeLevel), ...currentSessions]
    })
    setActiveSessionId(sessionId)
    setQuery('')
  }, [activeLevel])

  const startNewChat = () => {
    if (!activeLevel) return

    const id = createMessageId('chat')
    const newSession: TivotChatSession = {
      id,
      title: activeLevel.title,
      context: createEmptyTivotConversationContext(),
      messages: [createInitialLevelMessage(activeLevel)],
    }

    setSessions((currentSessions) => [newSession, ...currentSessions])
    setActiveSessionId(id)
    setQuery('')
  }

  const submitMessage = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || !activeSession || !activeLevel || isResponding) return

    await submitPrompt(trimmedQuery)
  }

  const submitQuickReply = async (optionText: string) => {
    if (!activeSession || !activeLevel || isResponding) return
    await submitPrompt(optionText)
  }

  const submitPrompt = async (prompt: string) => {
    if (!activeSession || !activeLevel || isResponding) return

    const sessionSnapshot = activeSession
    const userMessage = createUserMessage(prompt)
    const updatedMessages = [...sessionSnapshot.messages, userMessage]

    setQuery('')
    setIsResponding(true)
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionSnapshot.id ? { ...session, messages: updatedMessages } : session,
      ),
    )

    const response = await processTivotUserAction({
      userPayload: { user_action: 'send_message', message: prompt },
      context: sessionSnapshot.context,
      conversationHistory: updatedMessages,
      activeLevel,
    })

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionSnapshot.id
          ? {
              ...session,
              title: session.messages.length === 2 ? createSessionTitle(prompt) : session.title,
              context: response.context,
              messages: [...session.messages, createAssistantMessage(response.payload)],
            }
          : session,
      ),
    )
    setIsResponding(false)
  }

  const submitFlowOrder = async (messageId: string, problemId: string, submittedOrder: string[]) => {
    if (!activeSession) return

    const sessionSnapshot = activeSession
    setFlowSubmission(sessionSnapshot.id, messageId, {
      status: 'SUBMITTING',
      submittedOrder,
      feedback: null,
      llmInvoked: false,
    })

    const response = await processTivotUserAction({
      userPayload: {
        user_action: 'submit_flow_order',
        problem_id: problemId,
        submitted_order: submittedOrder,
      },
      context: sessionSnapshot.context,
      activeLevel,
    })

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionSnapshot.id
          ? {
              ...session,
              context: response.context,
              messages: session.messages.map((message) =>
                message.role === 'assistant' && message.id === messageId
                  ? {
                      ...message,
                      submission: {
                        status: 'LOCKED',
                        submittedOrder,
                        feedback: response.payload,
                        llmInvoked: response.llmInvoked,
                      },
                    }
                  : message,
              ),
            }
          : session,
      ),
    )
  }

  const setFlowSubmission = (sessionId: string, messageId: string, submission: FlowSubmissionState) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((message) =>
                message.role === 'assistant' && message.id === messageId ? { ...message, submission } : message,
              ),
            }
          : session,
      ),
    )
  }

  return {
    sessions,
    activeSession,
    activeSessionId,
    query,
    isResponding,
    setActiveSessionId,
    setQuery,
    submitMessage,
    submitPrompt,
    submitQuickReply,
    createChat: startNewChat,
    startNewChat,
    submitFlowOrder,
  }
}
