import { useState, type SyntheticEvent } from 'react'
import { MessageSquarePlus, PanelLeft, PanelRight, Settings } from 'lucide-react'
import type { TivotChatSession } from '@shared/types'

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

interface SidebarTooltip {
  title: string
  top: number
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
  const [tooltip, setTooltip] = useState<SidebarTooltip | null>(null)

  const showTooltip = (event: SyntheticEvent<HTMLButtonElement>, title: string) => {
    if (!isOpen) return

    const rect = event.currentTarget.getBoundingClientRect()
    setTooltip({
      title,
      top: rect.top + rect.height / 2,
    })
  }

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
            data-title={session.title}
            onClick={() => {
              setTooltip(null)
              onSelectSession(session.id)
            }}
            onMouseEnter={(event) => showTooltip(event, session.title)}
            onMouseLeave={() => setTooltip(null)}
            onFocus={(event) => showTooltip(event, session.title)}
            onBlur={() => setTooltip(null)}
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
      {tooltip && (
        <div className="sidebar-title-tooltip" style={{ top: tooltip.top }} role="tooltip">
          {tooltip.title}
        </div>
      )}
    </aside>
  )
}
