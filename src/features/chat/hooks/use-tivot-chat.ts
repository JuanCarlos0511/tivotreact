import { useMemo, useState } from 'react'
import type {
  FlowSubmissionState,
  TivotAssistantChatMessage,
  TivotAssistantPayload,
  TivotChatSession,
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

const conceptFromProblem = (problem: TivotProblem) => problem.tags[0] ?? 'Arquitectura POS'

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
    `${problem.system_context}\n\nQue decision de diseno protegeria el dato critico sin mezclar reglas de cobro?`,
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

const createInitialSessions = (): TivotChatSession[] =>
  TIVOT_PROBLEM_CATALOG.map((problem) => ({
    id: problem.problem_id,
    title: problem.title,
    context: createEmptyTivotConversationContext(problem.problem_id),
    messages: [createAssistantMessage(createPayloadFromProblem(problem))],
  }))

export const useTivotChat = () => {
  const [sessions, setSessions] = useState<TivotChatSession[]>(() => createInitialSessions())
  const [activeSessionId, setActiveSessionId] = useState(
    () => TIVOT_PROBLEM_CATALOG[2]?.problem_id ?? TIVOT_PROBLEM_CATALOG[0]?.problem_id ?? 'default',
  )
  const [query, setQuery] = useState('')
  const [isResponding, setIsResponding] = useState(false)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [activeSessionId, sessions],
  )

  const createChat = () => {
    const id = createMessageId('chat')
    const welcomePayload = createStandardTextPayload(
      'Trae un caso POS: doble cobro, stock negativo, caja descuadrada o descuentos en conflicto. Lo reducimos a invariantes.',
      {
        is_evaluation: false,
        passed: null,
        concept: 'Arquitectura POS',
      },
    )

    const newSession: TivotChatSession = {
      id,
      title: 'Nueva conversacion POS',
      context: createEmptyTivotConversationContext(),
      messages: [createAssistantMessage(welcomePayload)],
    }

    setSessions((currentSessions) => [newSession, ...currentSessions])
    setActiveSessionId(id)
    setQuery('')
  }

  const submitMessage = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || !activeSession || isResponding) return

    const sessionSnapshot = activeSession
    const userMessage = {
      id: createMessageId('user'),
      role: 'user' as const,
      content: trimmedQuery,
      createdAt: new Date().toISOString(),
    }

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
      userPayload: { user_action: 'send_message', message: trimmedQuery },
      context: sessionSnapshot.context,
    })

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionSnapshot.id
          ? {
              ...session,
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
    createChat,
    submitMessage,
    submitFlowOrder,
  }
}
