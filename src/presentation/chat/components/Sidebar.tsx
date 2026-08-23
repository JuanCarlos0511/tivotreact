import { MessageSquarePlus, PanelLeft, PanelRight, Settings } from 'lucide-react'
import type { TivotChatSession } from '../types'

interface SidebarProps {
  sessions: TivotChatSession[]
  activeSessionId: string
  isOpen: boolean
  logoSrc: string
  onToggle: () => void
  onCreateChat: () => void
  onSelectSession: (sessionId: string) => void
  onOpenSettings: () => void
}

export function Sidebar({
  sessions,
  activeSessionId,
  isOpen,
  logoSrc,
  onToggle,
  onCreateChat,
  onSelectSession,
  onOpenSettings,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? '' : 'sidebar-collapsed'}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
        title={isOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
        type="button"
      >
        {isOpen ? <PanelLeft size={16} /> : <PanelRight size={16} />}
      </button>
      <div className="sidebar-top">
        <div className="brand">
          <img className="brand-logo" src={logoSrc} alt="Tivot" />
        </div>
        <button className="new-chat-button" onClick={onCreateChat} type="button">
          <MessageSquarePlus size={16} />
          <span>Nueva conversacion</span>
        </button>
      </div>
      <div className="history-heading">Recientes</div>
      <nav className="chat-history" aria-label="Historial de chats">
        {sessions.map((session) => (
          <button
            key={session.id}
            className={`chat-history-item ${activeSessionId === session.id ? 'active' : ''}`}
            onClick={() => onSelectSession(session.id)}
            type="button"
          >
            <span className="chat-history-title">{session.title}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="settings-button" type="button" onClick={onOpenSettings}>
          <Settings size={16} />
          <span>Configuracion</span>
        </button>
      </div>
    </aside>
  )
}
