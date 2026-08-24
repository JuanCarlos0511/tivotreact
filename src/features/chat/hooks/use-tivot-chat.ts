import { useMemo, useState } from 'react'
import type {
  FlowSubmissionState,
  TivotAssistantChatMessage,
  TivotAssistantPayload,
  TivotChatSession,
  TivotConversationContext,
  TivotProblem,
} from '@shared/types'
import {
  createEmptyTivotConversationContext,
  createStandardTextPayload,
  isInteractiveFlowProblem,
} from '@shared/types'
import { TIVOT_PROBLEM_CATALOG } from '@shared/catalog'
import { processTivotUserAction } from '@services/inference.service'

const createMessageId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

const conceptFromProblem = (problem: TivotProblem) => problem.tags[0] ?? 'Algoritmos'

const rotateNodes = <T,>(items: T[]): T[] => {
  const [firstItem, ...restItems] = items
  return firstItem ? [...restItems, firstItem] : []
}

const createPayloadFromProblem = (problem: TivotProblem): TivotAssistantPayload => {
  if (isInteractiveFlowProblem(problem)) {
    return {
      type: 'interactive_flow',
      problem_id: problem.problem_id,
      message: problem.system_context,
      flow_data: {
        instruction: problem.flow_definition.instruction,
        nodes: rotateNodes(problem.flow_definition.nodes),
      },
      metadata: {
        is_evaluation: false,
        passed: null,
        concept: conceptFromProblem(problem),
      },
    }
  }

  return createStandardTextPayload(
    `${problem.system_context}\n\nQue paso le darias al robot para que sepa que hacer?`,
    {
      is_evaluation: false,
      passed: null,
      concept: conceptFromProblem(problem),
    },
    problem.problem_id,
  )
}

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

const appendStarterTurn = (
  context: TivotConversationContext,
  prompt: string,
  payload: TivotAssistantPayload,
): TivotConversationContext => ({
  metadata: {
    active_problem_id: payload.problem_id,
    attempt_count: 0,
  },
  turns: [
    ...context.turns,
    {
      user_message: prompt,
      assistant_message: payload.message,
      assistant_type: payload.type,
      problem_id: payload.problem_id,
      metadata: payload.metadata,
      created_at: new Date().toISOString(),
    },
  ].slice(-3),
})

const createInitialSessions = (): TivotChatSession[] => [
  {
    id: 'new-chat',
    title: 'Nueva conversacion',
    context: createEmptyTivotConversationContext(),
    messages: [],
  },
]

export const useTivotChat = () => {
  const [sessions, setSessions] = useState<TivotChatSession[]>(() => createInitialSessions())
  const [activeSessionId, setActiveSessionId] = useState(() => 'new-chat')
  const [query, setQuery] = useState('')
  const [isResponding, setIsResponding] = useState(false)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [activeSessionId, sessions],
  )

  const startNewChat = () => {
    const id = createMessageId('chat')

    const newSession: TivotChatSession = {
      id,
      title: 'Nueva conversacion',
      context: createEmptyTivotConversationContext(),
      messages: [],
    }

    setSessions((currentSessions) => [newSession, ...currentSessions])
    setActiveSessionId(id)
    setQuery('')
  }

  const submitMessage = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || !activeSession || isResponding) return

    await submitPrompt(trimmedQuery)
  }

  const handleSelectStarterTopic = async (prompt: string, problemId?: string) => {
    if (!activeSession || isResponding) return

    const selectedProblem = problemId
      ? TIVOT_PROBLEM_CATALOG.find((problem) => problem.problem_id === problemId)
      : null

    if (!selectedProblem) {
      await submitPrompt(prompt)
      return
    }

    const sessionSnapshot = activeSession
    const userMessage = createUserMessage(prompt)
    const assistantPayload = createPayloadFromProblem(selectedProblem)
    const assistantMessage = createAssistantMessage(assistantPayload)

    setQuery('')
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionSnapshot.id
          ? {
              ...session,
              title: selectedProblem.title,
              context: appendStarterTurn(session.context, prompt, assistantPayload),
              messages: [...session.messages, userMessage, assistantMessage],
            }
          : session,
      ),
    )
  }

  const submitPrompt = async (prompt: string) => {
    if (!activeSession || isResponding) return

    const sessionSnapshot = activeSession
    const userMessage = createUserMessage(prompt)

    setQuery('')
    setIsResponding(true)
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionSnapshot.id
          ? { ...session, messages: [...session.messages, userMessage] }
          : session,
      ),
    )

    const response = await processTivotUserAction({
      userPayload: { user_action: 'send_message', message: prompt },
      context: sessionSnapshot.context,
    })

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionSnapshot.id
          ? {
              ...session,
              title: session.messages.length === 1 ? prompt.slice(0, 48) : session.title,
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
    handleSelectStarterTopic,
    createChat: startNewChat,
    startNewChat,
    submitFlowOrder,
  }
}
