import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { GripVertical, Moon, PanelLeft, PanelRight, Send, Settings, Sun, MessageSquarePlus } from 'lucide-react'
import { applyTheme, getInitialTheme, toggleTheme, type ThemeMode } from './theme/theme'
import { TIVOT_DRAG_DROP_FLOWS, TIVOT_TEXT_QUESTIONS } from '@shared/prompts/tivot-generation.prompt'
import tivotIcon from './assets/tivot_icon.png'
import tivotLogoClear from './assets/tivot_logo_clear.png'
import tivotLogoDark from './assets/tivot_logo_dark.png'
import './index.css'

type ChatHistoryItem = { id: string; title: string }
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }
type FlowStep = { id: string; text: string }
type FlowExercise = {
  title: string
  scenario: string
  instructions: string
  steps_correct_order: FlowStep[]
  explanation: string
}

const doubleClickScenario = TIVOT_TEXT_QUESTIONS[0]!
const barcodeScenario = TIVOT_TEXT_QUESTIONS[1]!
const phantomInventoryScenario = TIVOT_TEXT_QUESTIONS[2]!
const shiftShortfallScenario = TIVOT_TEXT_QUESTIONS[3]!
const returnFlowScenario = TIVOT_DRAG_DROP_FLOWS[0]!
const salePaymentFlowScenario = TIVOT_DRAG_DROP_FLOWS[2]!
const activeFlowScenario = salePaymentFlowScenario

const initialScenarioChats = [
  doubleClickScenario,
  barcodeScenario,
  phantomInventoryScenario,
  shiftShortfallScenario,
  returnFlowScenario,
  salePaymentFlowScenario,
] as const

const initialChats: ChatHistoryItem[] = initialScenarioChats.map((scenario) => ({
  id: scenario.title,
  title: scenario.title,
}))

const initialMessages: Record<string, ChatMessage[]> = {
  [doubleClickScenario.title]: [{ id: 'assistant-0', role: 'assistant', content: doubleClickScenario.scenario }],
  [barcodeScenario.title]: [{ id: 'assistant-1', role: 'assistant', content: barcodeScenario.scenario }],
  [phantomInventoryScenario.title]: [{ id: 'assistant-2', role: 'assistant', content: phantomInventoryScenario.scenario }],
  [shiftShortfallScenario.title]: [{ id: 'assistant-3', role: 'assistant', content: shiftShortfallScenario.scenario }],
  [returnFlowScenario.title]: [{ id: 'assistant-4', role: 'assistant', content: returnFlowScenario.scenario }],
  [salePaymentFlowScenario.title]: [{ id: 'assistant-5', role: 'assistant', content: salePaymentFlowScenario.scenario }],
}

const flowPreviewDeck: FlowExercise[] = [
  returnFlowScenario,
  TIVOT_DRAG_DROP_FLOWS[1]!,
  salePaymentFlowScenario,
  TIVOT_DRAG_DROP_FLOWS[3]!,
]

const shufflePreviewSteps = (steps: FlowStep[]) => {
  const reordered = [...steps]
  if (reordered.length > 1) {
    const firstStep = reordered.shift()
    if (firstStep) reordered.push(firstStep)
  }
  return reordered
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [chats, setChats] = useState(initialChats)
  const [messages, setMessages] = useState(initialMessages)
  const [activeChatId, setActiveChatId] = useState(activeFlowScenario.title)
  const [query, setQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>(() => shufflePreviewSteps(activeFlowScenario.steps_correct_order))
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null)
  const [flashedStepIds, setFlashedStepIds] = useState<string[]>([])
  const flashTimerRef = useRef<number | null>(null)

  useEffect(() => applyTheme(theme), [theme])

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) ?? chats[0], [activeChatId, chats])
  const activeMessages = useMemo(() => (activeChat ? messages[activeChat.id] ?? [] : []), [activeChat, messages])
  const activeFlow = useMemo(() => flowPreviewDeck.find((flow) => flow.title === activeChatId) ?? null, [activeChatId])

  useEffect(() => {
    if (!activeFlow) return
    setFlowSteps(shufflePreviewSteps(activeFlow.steps_correct_order))
    setDraggedStepId(null)
    setHoveredStepId(null)
    setFlashedStepIds([])
  }, [activeFlow])

  useEffect(() => () => {
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
    }
  }, [])

  const assistantMessage = [...activeMessages].reverse().find((message) => message.role === 'assistant') ?? {
    id: 'assistant-fallback',
    role: 'assistant',
    content: 'Elige uno de los escenarios recientes para ver cómo funciona el flujo.',
  }
  const sidebarLogo = theme === 'light' ? tivotLogoClear : tivotLogoDark

  const createChat = () => {
    const id = `chat-${Date.now()}`
    const newChat: ChatHistoryItem = { id, title: 'Nueva conversación' }
    setChats((currentChats) => [newChat, ...currentChats])
    setMessages((currentMessages) => ({
      ...currentMessages,
      [id]: [{ id: `assistant-${Date.now()}`, role: 'assistant', content: 'Escribe un caso POS y lo revisamos paso a paso.' }],
    }))
    setActiveChatId(id)
    setQuery('')
  }

  const moveStepToSlot = (draggedId: string, slotId: string) => {
    setFlowSteps((currentSteps) => {
      const currentIndex = currentSteps.findIndex((step) => step.id === draggedId)
      const targetIndex = currentSteps.findIndex((step) => step.id === slotId)
      if (currentIndex === -1 || targetIndex === -1 || currentIndex === targetIndex) return currentSteps

      const reordered = [...currentSteps]
      ;[reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex]!, reordered[currentIndex]!]
      return reordered
    })

    setFlashedStepIds([draggedId, slotId])
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlashedStepIds([])
      flashTimerRef.current = null
    }, 700)
  }

  const handleFlowDragStart = (stepId: string) => {
    setDraggedStepId(stepId)
  }

  const handleFlowDragEnd = () => {
    setDraggedStepId(null)
    setHoveredStepId(null)
  }

  const handleStepDragOver = (event: DragEvent<HTMLButtonElement>, stepId: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setHoveredStepId(stepId)
  }

  const handleStepDrop = (event: DragEvent<HTMLButtonElement>, stepId: string) => {
    event.preventDefault()
    if (!draggedStepId) return
    moveStepToSlot(draggedStepId, stepId)
    setDraggedStepId(null)
    setHoveredStepId(null)
  }

  const renderCenterContent = () => {
    if (activeFlow) {
      return (
        <>
          <div className="flow-preview-header">
            <h2 className="flow-preview-title">{activeFlow.title}</h2>
          </div>
          <section className="flow-preview-panel" aria-label={`Vista previa de ${activeFlow.title}`}>
            <div className="flow-preview-list flow-preview-list-single">
              {flowSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={`flow-preview-step flow-preview-step-drag ${draggedStepId === step.id ? 'flow-preview-step-dragging' : ''} ${hoveredStepId === step.id ? 'flow-preview-step-hovered' : ''} ${flashedStepIds.includes(step.id) ? 'flow-preview-step-flash' : ''}`}
                  draggable
                  onDragStart={() => handleFlowDragStart(step.id)}
                  onDragOver={(event) => handleStepDragOver(event, step.id)}
                  onDragLeave={() => {
                    if (hoveredStepId === step.id) setHoveredStepId(null)
                  }}
                  onDrop={(event) => handleStepDrop(event, step.id)}
                  onDragEnd={handleFlowDragEnd}
                >
                  <GripVertical size={15} />
                  <span className="flow-preview-step-index">{index + 1}</span>
                  <span className="flow-preview-step-text">{step.text}</span>
                </button>
              ))}
            </div>
          </section>
          <button className="flow-submit-button" type="button" onClick={submitQuery}>
            Enviar respuesta
          </button>
        </>
      )
    }

    return (
      <>
        <div className="assistant-bubble">{assistantMessage.content}</div>
        <div className="icon-wrap" aria-hidden="true">
          <img className="hero-icon" src={tivotIcon} alt="" />
        </div>
        <div className="composer composer-hero">
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitQuery() } }} placeholder="Escribe un mensaje sobre tu operación POS..." rows={1} />
          <button onClick={submitQuery} className="send-button" aria-label="Enviar mensaje"><Send size={17} /></button>
        </div>
      </>
    )
  }

  const submitQuery = () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || !activeChat) return
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmedQuery }
    const assistantMessage: ChatMessage = { id: `assistant-${Date.now()}`, role: 'assistant', content: 'Recibí tu consulta. El motor POS la analizará con el contexto de esta conversación.' }
    setMessages((currentMessages) => ({
      ...currentMessages,
      [activeChat.id]: [...(currentMessages[activeChat.id] ?? []), userMessage, assistantMessage],
    }))
    setQuery('')
  }

  return (
    <main className="app-shell">
      {isSettingsOpen && <button className="modal-backdrop" aria-label="Cerrar configuración" onClick={() => setIsSettingsOpen(false)} />}
      {isSettingsOpen && (
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <header className="settings-modal-header">
            <p className="settings-eyebrow" id="settings-title">Configuración</p>
          </header>
          <div className="settings-row">
            <span className="settings-row-label">Tema del chat</span>
            <div className="theme-switch" aria-label="Tema del chat">
              <button className={`theme-option ${theme === 'dark' ? 'active' : ''}`} type="button" onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? currentTheme : toggleTheme(currentTheme)))}>
                <Moon size={15} />
                <span>Modo oscuro</span>
              </button>
              <button className={`theme-option ${theme === 'light' ? 'active' : ''}`} type="button" onClick={() => setTheme((currentTheme) => (currentTheme === 'light' ? currentTheme : toggleTheme(currentTheme)))}>
                <Sun size={15} />
                <span>Modo claro</span>
              </button>
            </div>
          </div>
          <div className="settings-placeholder" aria-hidden="true" />
        </section>
      )}
      <aside className={`sidebar ${isSidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen((current) => !current)}
          aria-label={isSidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
          title={isSidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
        >
          {isSidebarOpen ? <PanelLeft size={16} /> : <PanelRight size={16} />}
        </button>
        <div className="sidebar-top">
          <div className="brand">
            <img className="brand-logo" src={sidebarLogo} alt="Tivot" />
          </div>
          <button className="new-chat-button" onClick={createChat}><MessageSquarePlus size={16} /> Nueva conversación</button>
        </div>
        <div className="history-heading">Recientes</div>
        <nav className="chat-history" aria-label="Historial de chats">
          {chats.map((chat) => (
            <button key={chat.id} className={`chat-history-item ${activeChatId === chat.id ? 'active' : ''}`} onClick={() => setActiveChatId(chat.id)}>
              <span className="chat-history-title">{chat.title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="settings-button" type="button" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={16} />
            <span>Configuración</span>
          </button>
        </div>
      </aside>
      <section className="workspace">
        <div className="ambient-field" aria-hidden="true">
          <span className="node node-one" />
          <span className="node node-two" />
          <span className="node node-three" />
        </div>
        <div className="center-stage">
          {renderCenterContent()}
        </div>
      </section>
    </main>
  )
}

export default App
