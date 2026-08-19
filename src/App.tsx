import { useEffect, useMemo, useState } from 'react'
import { Bot, Check, ChevronRight, Menu, MessageSquarePlus, Moon, Search, Send, Sun, Trash2, Workflow } from 'lucide-react'
import { applyTheme, getInitialTheme, toggleTheme, type ThemeMode } from './theme/theme'
import './index.css'

type ChatHistoryItem = { id: string; title: string; preview: string; time: string }
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const initialChats: ChatHistoryItem[] = [
  { id: 'stock', title: 'Balance de inventario', preview: 'Revisar diferencias del turno', time: 'Ahora' },
  { id: 'shrinkage', title: 'Detección de mermas', preview: 'Productos con pérdida atípica', time: 'Ayer' },
  { id: 'cash', title: 'Arqueo de caja', preview: 'Auditoría del cierre nocturno', time: 'Lun' },
  { id: 'discounts', title: 'Descuentos dinámicos', preview: 'Matriz para productos próximos', time: 'Dom' },
]

const initialMessages: Record<string, ChatMessage[]> = {
  stock: [{ id: 'stock-answer', role: 'assistant', content: 'Hola. Puedo ayudarte a revisar cualquier proceso de inventario o lógica de punto de venta.' }],
  shrinkage: [{ id: 'shrinkage-answer', role: 'assistant', content: 'Esta conversación está lista para analizar diferencias entre ventas, existencias y conteos físicos.' }],
  cash: [{ id: 'cash-answer', role: 'assistant', content: 'Podemos revisar el arqueo comparando efectivo esperado, movimientos y saldo contado.' }],
  discounts: [{ id: 'discounts-answer', role: 'assistant', content: 'Podemos construir una matriz de descuentos según rotación, caducidad y unidades disponibles.' }],
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [chats, setChats] = useState(initialChats)
  const [messages, setMessages] = useState(initialMessages)
  const [activeChatId, setActiveChatId] = useState('stock')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [showProcess, setShowProcess] = useState(false)
  const [processStep, setProcessStep] = useState(2)

  useEffect(() => applyTheme(theme), [theme])

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0]
  const visibleChats = useMemo(() => chats.filter((chat) => chat.title.toLowerCase().includes(search.toLowerCase())), [chats, search])
  const activeMessages = activeChat ? messages[activeChat.id] ?? [] : []

  const createChat = () => {
    const id = `chat-${Date.now()}`
    const newChat: ChatHistoryItem = { id, title: 'Nueva conversación', preview: 'Sin mensajes todavía', time: 'Ahora' }
    setChats((currentChats) => [newChat, ...currentChats])
    setMessages((currentMessages) => ({ ...currentMessages, [id]: [] }))
    setActiveChatId(id)
    setQuery('')
    setShowProcess(false)
  }

  const removeChat = (chatId: string) => {
    const remainingChats = chats.filter((chat) => chat.id !== chatId)
    if (!remainingChats.length) return
    setChats(remainingChats)
    const nextChat = remainingChats[0]
    if (activeChatId === chatId && nextChat) setActiveChatId(nextChat.id)
    if (activeChatId === chatId) setShowProcess(false)
  }

  const submitQuery = () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || !activeChat) return
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmedQuery }
    const assistantMessage: ChatMessage = { id: `assistant-${Date.now()}`, role: 'assistant', content: 'Recibí tu consulta. El motor POS la analizará con el contexto de esta conversación.' }
    setMessages((currentMessages) => ({ ...currentMessages, [activeChat.id]: [...(currentMessages[activeChat.id] ?? []), userMessage, assistantMessage] }))
    setChats((currentChats) => currentChats.map((chat) => chat.id === activeChat.id ? { ...chat, title: chat.title === 'Nueva conversación' ? trimmedQuery.slice(0, 30) : chat.title, preview: trimmedQuery, time: 'Ahora' } : chat))
    setQuery('')
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">T</span><strong>Tivot</strong></div>
        <button className="new-chat-button" onClick={createChat}><MessageSquarePlus size={17} /> Nueva conversación</button>
        <label className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar chats" /></label>
        <div className="history-heading"><span>Historial</span><span>{visibleChats.length}</span></div>
        <nav className="chat-history" aria-label="Historial de chats">
          {visibleChats.map((chat) => <button key={chat.id} className={`chat-history-item ${activeChatId === chat.id ? 'active' : ''}`} onClick={() => { setActiveChatId(chat.id); setShowProcess(false) }}><span className="chat-history-copy"><strong>{chat.title}</strong><small>{chat.preview}</small></span><span className="chat-history-time">{chat.time}</span></button>)}
        </nav>
        <div className="sidebar-foot"><span className="online-dot" /> Historial local</div>
      </aside>
      <section className="workspace">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label="Abrir historial"><Menu size={19} /></button><span className="status-dot" /> Tivot <span className="topbar-meta">{activeChat?.title ?? 'Nueva conversación'}<button className="theme-toggle" onClick={() => setTheme((currentTheme) => toggleTheme(currentTheme))} aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'} title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button></span></header>
        <div className="ambient-field" aria-hidden="true"><span className="sparkle sparkle-one">✦</span><span className="sparkle sparkle-two">✦</span><span className="sparkle sparkle-three">✧</span><span className="sparkle sparkle-four">✦</span><span className="node node-one" /><span className="node node-two" /><span className="node node-three" /></div>
        <div className="content">
          <div className="eyebrow">CONVERSACIÓN POS</div>
          <h1>{activeChat?.title ?? 'Nueva conversación'}</h1>
          <p className="intro">Pregunta sobre procesos, inventario y lógica de punto de venta en lenguaje cotidiano.</p>
          <div className={`chat-panel ${showProcess ? 'process-panel' : ''}`}>
            {showProcess ? <div className="process-view"><div className="process-guide"><div className="bot-orb small"><Bot size={28} /></div><div className="guide-bubble">Mantén pulsado y<br />arrastra para definir el orden correcto <span>✦</span></div></div><div className="process-track"><div className="process-title">Inicio del Proceso</div>{['Escanear', 'Verificar', 'Empacar', 'Confirmar'].map((step, index) => <button key={step} className={`process-step ${processStep === index + 1 ? 'current' : ''} ${processStep > index + 1 ? 'done' : ''}`} onClick={() => setProcessStep(index + 1)}><span>Paso {index + 1}: {step}</span>{processStep > index + 1 ? <Check size={16} /> : <ChevronRight size={16} />}</button>)}</div><button className="back-chat" onClick={() => setShowProcess(false)}>Volver a la conversación</button></div> : <div className="messages">{activeMessages.length ? activeMessages.map((message) => <div key={message.id} className={`message ${message.role}`}><span className="avatar">{message.role === 'user' ? 'Tú' : <Bot size={17} />}</span><div><small>{message.role === 'user' ? 'Tu consulta' : 'Tivot'}</small><p>{message.content}</p></div></div>) : <div className="empty-state"><div className="bot-orb"><Bot size={29} /></div><span>Comienza una nueva conversación</span></div>}</div>}
            <div className="composer"><textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitQuery() } }} placeholder="Escribe un mensaje sobre tu operación POS..." rows={2} /><button onClick={submitQuery} className="send-button" aria-label="Enviar mensaje"><Send size={17} /></button></div>
          </div>
          <div className="conversation-actions"><span>Las conversaciones se guardan localmente</span><span className="action-group">{activeChat?.id === 'stock' && <button className="flow-button" onClick={() => setShowProcess((current) => !current)}><Workflow size={14} /> {showProcess ? 'Ver chat' : 'Abrir flujo'}</button>}{activeChat && <button className="delete-button" onClick={() => removeChat(activeChat.id)} disabled={chats.length === 1}><Trash2 size={14} /> Eliminar chat</button>}</span></div>
        </div>
      </section>
    </main>
  )
}

export default App
