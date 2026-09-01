import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { KarelLevel, TivotChatSession } from '@shared/types'
import { KarelCodeEditor } from '@features/karel/components/KarelCodeEditor'
import { KarelGrid8x8 } from '@features/karel/components/KarelGrid8x8'
import { useKarelRunner } from '@features/karel/hooks/use-karel-runner'
import { FloatingChatDrawer } from './FloatingChatDrawer'

type LevelOneTutorialStep = 'chat' | 'code' | 'runner' | 'compile'

const LEVEL_ONE_TUTORIAL_STEPS: LevelOneTutorialStep[] = ['chat', 'code', 'runner', 'compile']

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
  const [tutorialStep, setTutorialStep] = useState<LevelOneTutorialStep | null>(
    activeLevel.id === 1 ? 'chat' : null,
  )
  const runner = useKarelRunner(activeLevel.initialWorld)
  const isChatTutorialStep = tutorialStep === 'chat'
  const editorTutorialFocus = tutorialStep === 'code' || tutorialStep === 'runner' || tutorialStep === 'compile'
    ? tutorialStep
    : null
  const chatPrompt = isChatTutorialStep
    ? 'Conoce a Tivot: sera tu guia de apoyo para aprender a programar paso a paso durante este reto.'
    : activeLevel.objective

  useEffect(() => {
    setCode(activeLevel.starterCode)
    setIsChatOpen(false)
    setShowObjective(true)
    setTutorialStep(activeLevel.id === 1 ? 'chat' : null)
    runner.resetExecution()
  }, [activeLevel])

  const advanceTutorial = () => {
    if (!tutorialStep) return

    const currentIndex = LEVEL_ONE_TUTORIAL_STEPS.indexOf(tutorialStep)
    const nextStep = LEVEL_ONE_TUTORIAL_STEPS[currentIndex + 1] ?? null
    setTutorialStep(nextStep)
    setShowObjective(false)
  }

  const dismissTutorial = () => {
    setTutorialStep(null)
    setShowObjective(false)
  }

  const resetCodeAndWorld = () => {
    setCode(activeLevel.starterCode)
    runner.resetExecution()
  }

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode)
    if (!runner.isRunning) runner.resetExecution()
  }

  return (
    <section className={`karel-workspace ${tutorialStep ? 'karel-workspace-tutorial' : ''}`}>
      {tutorialStep && <div className="tutorial-backdrop" aria-hidden="true" />}
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
        tutorialFocus={editorTutorialFocus}
        onTutorialNext={advanceTutorial}
        onTutorialDismiss={dismissTutorial}
      />

      <FloatingChatDrawer
        session={session}
        query={query}
        isResponding={isResponding}
        isOpen={isChatOpen}
        objective={chatPrompt}
        showObjective={isChatTutorialStep || showObjective}
        isIntroPrompt={isChatTutorialStep}
        onContinueIntro={advanceTutorial}
        onDismissIntro={dismissTutorial}
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
