import { useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  FlowSubmissionState,
  KarelLevel,
  TivotAssistantChatMessage,
  TivotAssistantPayload,
  TivotAiContext,
  TivotChatSession,
} from '../../../shared/types'
import { createEmptyTivotConversationContext, createStandardTextPayload } from '../../../shared/types'
import { processTivotUserAction } from '../../../services/inference.service'

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
const createLevelStorageKey = (levelId: number) => `tivot_chat_level_${levelId}`

const createInitialLevelMessage = (level: KarelLevel): TivotAssistantChatMessage =>
  createAssistantMessage(
    createStandardTextPayload(
      `¡Hola! Te acompañaré paso a paso en este reto. ${level.objective}${level.mode === 'challenge' || !level.initialMessage ? '' : `\n\n${level.initialMessage}`}`,
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

const loadLevelSession = async (level: KarelLevel): Promise<TivotChatSession | null> => {
  try {
    const stored = await AsyncStorage.getItem(createLevelStorageKey(level.id))
    if (!stored) return null
    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return null

    const session = parsed as TivotChatSession
    if (!Array.isArray(session.messages) || !session.context || !Array.isArray(session.context.turns)) return null
    return {
      ...session,
      id: createLevelSessionId(level.id),
      title: level.title,
      messages: session.messages.map(message => message.role === 'assistant'
        ? {
            ...message,
            payload: {
              ...message.payload,
              suggestsCode: Boolean(message.payload.suggestedCode?.length),
              suggestedCode: message.payload.suggestedCode?.length ? message.payload.suggestedCode : null,
            },
          }
        : message),
    }
  } catch {
    return null
  }
}

const persistLevelSession = async (levelId: number, session: TivotChatSession) => {
  try {
    await AsyncStorage.setItem(createLevelStorageKey(levelId), JSON.stringify(session))
  } catch {
    // The current in-memory conversation remains usable if device storage is unavailable.
  }
}

export const useTivotChat = (activeLevel: KarelLevel | null) => {
  const [sessions, setSessions] = useState<TivotChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [isResponding, setIsResponding] = useState(false)

  const expectedSessionId = activeLevel ? createLevelSessionId(activeLevel.id) : activeSessionId
  const activeSession = useMemo(
    () => sessions.find(session => session.id === expectedSessionId) ?? null,
    [expectedSessionId, sessions],
  )

  useEffect(() => {
    if (!activeLevel) return

    const sessionId = createLevelSessionId(activeLevel.id)
    setActiveSessionId(sessionId)
    setQuery('')
    let cancelled = false
    void loadLevelSession(activeLevel).then(storedSession => {
      if (cancelled) return
      setSessions(latestSessions => latestSessions.some(session => session.id === sessionId)
        ? latestSessions
        : [storedSession ?? createLevelSession(activeLevel), ...latestSessions])
    })
    return () => { cancelled = true }
  }, [activeLevel])

  useEffect(() => {
    if (!activeLevel) return
    const session = sessions.find(candidate => candidate.id === createLevelSessionId(activeLevel.id))
    if (session) void persistLevelSession(activeLevel.id, session)
  }, [activeLevel, sessions])

  const resetLevelChat = () => {
    if (!activeLevel || isResponding) return

    const session = createLevelSession(activeLevel)
    setSessions(currentSessions => [session, ...currentSessions.filter(candidate => candidate.id !== session.id)])
    setActiveSessionId(session.id)
    setQuery('')
  }

  const submitMessage = async (aiContext: TivotAiContext) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || !activeSession || !activeLevel || isResponding) return

    await submitPrompt(trimmedQuery, aiContext)
  }

  const submitQuickReply = async (optionText: string, aiContext: TivotAiContext) => {
    if (!activeSession || !activeLevel || isResponding) return
    await submitPrompt(optionText, aiContext)
  }

  const submitPrompt = async (prompt: string, aiContext: TivotAiContext) => {
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
      aiContext,
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
    createChat: resetLevelChat,
    startNewChat: resetLevelChat,
    resetLevelChat,
    submitFlowOrder,
  }
}
