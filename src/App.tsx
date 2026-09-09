import { useEffect, useState } from 'react'
import { applyTheme, getInitialTheme } from './theme/theme'
import { ChatWorkspace } from '@features/chat/components'
import { useTivotChat } from '@features/chat/hooks'
import { LevelSelectGrid } from '@features/navigation/LevelSelectGrid'
import { StartScreen } from '@features/navigation/StartScreen'
import type { KarelLevel } from '@shared/types'
import './index.css'
import './mobile-game.css'

type AppScreen = 'START' | 'LEVEL_SELECT' | 'WORKSPACE'

function App() {
  const [theme] = useState(getInitialTheme)
  const [screen, setScreen] = useState<AppScreen>('START')
  const [activeLevel, setActiveLevel] = useState<KarelLevel | null>(null)
  const chat = useTivotChat(activeLevel)

  useEffect(() => applyTheme(theme), [theme])

  const handleSelectLevel = (level: KarelLevel) => {
    setActiveLevel(level)
    setScreen('WORKSPACE')
  }

  const handleBackToLevels = () => {
    setScreen('LEVEL_SELECT')
  }

  return (
    <main className={`app-shell karel-app-shell ${screen === 'WORKSPACE' ? 'game-screen-active' : ''}`}>
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
          onResetConversation={chat.resetLevelChat}
          onBackToLevels={handleBackToLevels}
        />
      )}
    </main>
  )
}

export default App
