import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { KarelLevel, TivotChatSession } from '@shared/types'
import { KarelCodeEditor } from '@features/karel/components/KarelCodeEditor'
import { KarelGrid8x8 } from '@features/karel/components/KarelGrid8x8'
import { useKarelRunner } from '@features/karel/hooks/use-karel-runner'
import { FloatingChatDrawer } from './FloatingChatDrawer'

interface ChatWorkspaceProps {
  session: TivotChatSession | null
  activeLevel: KarelLevel
  query: string
  isResponding: boolean
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSelectQuickReply: (optionText: string) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
  onBackToLevels: () => void
}

export function ChatWorkspace({
  session,
  activeLevel,
  query,
  isResponding,
  onQueryChange,
  onSubmitMessage,
  onSelectQuickReply,
  onSubmitFlowOrder,
  onBackToLevels,
}: ChatWorkspaceProps) {
  const [code, setCode] = useState(activeLevel.starterCode)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showObjective, setShowObjective] = useState(true)
  const runner = useKarelRunner(activeLevel.initialWorld)

  useEffect(() => {
    setCode(activeLevel.starterCode)
    setIsChatOpen(false)
    setShowObjective(true)
    runner.resetExecution()
  }, [activeLevel])

  const resetCodeAndWorld = () => {
    setCode(activeLevel.starterCode)
    runner.resetExecution()
  }

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode)
    if (!runner.isRunning) runner.resetExecution()
  }

  return (
    <section className="karel-workspace">
      <header className="karel-game-header">
        <button className="workspace-back-button" type="button" onClick={onBackToLevels}>
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <div className="workspace-level-copy">
          <span className="workspace-level-badge">Nivel {activeLevel.id}</span>
          <h1>{activeLevel.title.replace(/^Nivel \d+: /, '')}</h1>
        </div>
      </header>

      <KarelGrid8x8 world={runner.worldState} />

      <KarelCodeEditor
        code={code}
        activeLineNumber={runner.activeLineNumber}
        compileResult={runner.compileResult}
        executionError={runner.executionError}
        isRunning={runner.isRunning}
        isPaused={runner.isPaused}
        speedMultiplier={runner.speedMultiplier}
        onChange={handleCodeChange}
        onCompile={() => runner.compileCode(code)}
        onRun={() => runner.runCode(code)}
        onReset={resetCodeAndWorld}
        onPauseToggle={runner.togglePause}
        onStepBack={runner.stepBack}
        onStepForward={() => runner.stepForward(code)}
        onSpeedChange={runner.setSpeedMultiplier}
      />

      <FloatingChatDrawer
        session={session}
        query={query}
        isResponding={isResponding}
        isOpen={isChatOpen}
        objective={activeLevel.objective}
        showObjective={showObjective}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
        onDismissObjective={() => setShowObjective(false)}
        onQueryChange={onQueryChange}
        onSubmitMessage={onSubmitMessage}
        onSelectQuickReply={onSelectQuickReply}
        onSubmitFlowOrder={onSubmitFlowOrder}
      />
    </section>
  )
}
