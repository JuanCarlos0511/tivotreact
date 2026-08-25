import { useEffect, useState } from 'react'
import { applyTheme, type ThemeMode } from './theme/theme'
import { ChatWorkspace } from '@features/chat/components'
import { useTivotChat } from '@features/chat/hooks'
import { LevelSelectGrid } from '@features/navigation/LevelSelectGrid'
import { StartScreen } from '@features/navigation/StartScreen'
import type { KarelLevel } from '@shared/types'
import './index.css'

type AppScreen = 'START' | 'LEVEL_SELECT' | 'WORKSPACE'

function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [screen, setScreen] = useState<AppScreen>('START')
  const [activeLevel, setActiveLevel] = useState<KarelLevel | null>(null)
  const chat = useTivotChat(activeLevel)

  useEffect(() => applyTheme(theme), [theme])

  const handleSelectLevel = (level: KarelLevel) => {
    setActiveLevel(level)
    setScreen('WORKSPACE')
  }

  const handleBackToLevels = () => {
    setTheme('dark')
    setScreen('LEVEL_SELECT')
  }

  return (
    <main className="app-shell karel-app-shell">
      {screen === 'START' && <StartScreen onStart={() => setScreen('LEVEL_SELECT')} />}
      {screen === 'LEVEL_SELECT' && (
        <LevelSelectGrid onBack={() => setScreen('START')} onSelectLevel={handleSelectLevel} />
      )}
      {screen === 'WORKSPACE' && activeLevel && (
        <ChatWorkspace
          session={chat.activeSession}
          activeLevel={activeLevel}
          query={chat.query}
          isResponding={chat.isResponding}
          onQueryChange={chat.setQuery}
          onSubmitMessage={chat.submitMessage}
          onSelectQuickReply={chat.submitQuickReply}
          onSubmitFlowOrder={chat.submitFlowOrder}
          onBackToLevels={handleBackToLevels}
        />
      )}
    </main>
  )
}

export default App
