import { useEffect, useState } from 'react'
import { applyTheme, getInitialTheme } from './theme/theme'
import { ChatWorkspace } from '@features/chat/components'
import { useTivotChat } from '@features/chat/hooks'
import { LevelSelectGrid } from '@features/navigation/LevelSelectGrid'
import { SavedChallengesScreen } from '@features/navigation/SavedChallengesScreen'
import { StartScreen } from '@features/navigation/StartScreen'
import { createKarelChallenge, getKarelLevelById } from '@shared/catalog'
import { deleteSavedChallenge, loadSavedChallenges, renameSavedChallenge, saveChallenge } from '@features/karel/storage/saved-challenges'
import type { KarelLevel, KarelWorldState, SavedChallengeGame } from '@shared/types'
import './index.css'
import './mobile-game.css'

type AppScreen = 'START' | 'LEVEL_SELECT' | 'SAVED_GAMES' | 'WORKSPACE'

function App() {
  const [theme] = useState(getInitialTheme)
  const [screen, setScreen] = useState<AppScreen>('START')
  const [activeLevel, setActiveLevel] = useState<KarelLevel | null>(null)
  const [savedGames, setSavedGames] = useState<SavedChallengeGame[]>(() => loadSavedChallenges())
  const chat = useTivotChat(activeLevel)

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => {
    type LockableOrientation = ScreenOrientation & {
      lock?: (orientation: 'portrait-primary') => Promise<void>
    }
    const orientation = window.screen.orientation as LockableOrientation | undefined
    const lockPortrait = () => {
      if (orientation?.lock) void orientation.lock('portrait-primary').catch(() => undefined)
    }

    lockPortrait()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') lockPortrait()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', lockPortrait)
    window.addEventListener('pointerdown', lockPortrait, { once: true })
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', lockPortrait)
      window.removeEventListener('pointerdown', lockPortrait)
    }
  }, [])

  const handleSelectLevel = (level: KarelLevel) => {
    setActiveLevel(level)
    setScreen('WORKSPACE')
  }

  const handleBackToLevels = () => {
    setScreen('LEVEL_SELECT')
  }

  const handleSaveChallenge = (level: KarelLevel, world: KarelWorldState, code: string) => {
    saveChallenge(level, world, code)
    setSavedGames(loadSavedChallenges())
  }

  const handleNextLevel = () => {
    if (!activeLevel) return
    const next = activeLevel.id < 4 ? getKarelLevelById(activeLevel.id + 1) : createKarelChallenge()
    if (next) handleSelectLevel(next)
  }

  return (
    <main className={`app-shell karel-app-shell ${screen === 'WORKSPACE' ? 'game-screen-active' : ''}`}>
      {screen === 'START' && <StartScreen onStart={() => setScreen('LEVEL_SELECT')} />}
      {screen === 'LEVEL_SELECT' && (
        <LevelSelectGrid onBack={() => setScreen('START')} onSelectLevel={handleSelectLevel}
          onViewSavedGames={() => setScreen('SAVED_GAMES')} />
      )}
      {screen === 'SAVED_GAMES' && (
        <SavedChallengesScreen games={savedGames} onBack={() => setScreen('LEVEL_SELECT')}
          onLoad={(game) => handleSelectLevel(game.level)}
          onRename={(id, name) => setSavedGames(renameSavedChallenge(id, name))}
          onDelete={(id) => setSavedGames(deleteSavedChallenge(id))} />
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
          onNextLevel={handleNextLevel}
          onNewChallenge={() => handleSelectLevel(createKarelChallenge())}
          onSaveChallenge={handleSaveChallenge}
        />
      )}
    </main>
  )
}

export default App
