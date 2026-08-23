import { useEffect, useState } from 'react'
import { applyTheme, getInitialTheme, type ThemeMode } from './theme/theme'
import { ChatWorkspace, SettingsModal, Sidebar } from '@features/chat/components'
import { useTivotChat } from '@features/chat/hooks'
import tivotLogoClear from './assets/tivot_logo_clear.png'
import tivotLogoDark from './assets/tivot_logo_dark.png'
import './index.css'

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const chat = useTivotChat()

  useEffect(() => applyTheme(theme), [theme])

  const sidebarLogo = theme === 'light' ? tivotLogoClear : tivotLogoDark

  return (
    <main className="app-shell">
      {isSettingsOpen && (
        <SettingsModal
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      <Sidebar
        sessions={chat.sessions}
        activeSessionId={chat.activeSessionId}
        isOpen={isSidebarOpen}
        logoSrc={sidebarLogo}
        onToggle={() => setIsSidebarOpen((current) => !current)}
        onCreateChat={chat.createChat}
        onSelectSession={chat.setActiveSessionId}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <ChatWorkspace
        session={chat.activeSession}
        query={chat.query}
        isResponding={chat.isResponding}
        onQueryChange={chat.setQuery}
        onSubmitMessage={chat.submitMessage}
        onSubmitFlowOrder={chat.submitFlowOrder}
        onSelectStarterTopic={chat.handleSelectStarterTopic}
      />
    </main>
  )
}

export default App
