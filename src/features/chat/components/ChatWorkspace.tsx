import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { KarelLevel, TivotChatSession } from '@shared/types'
import { KarelCodeEditor } from '@features/karel/components/KarelCodeEditor'
import { KarelGrid8x8 } from '@features/karel/components/KarelGrid8x8'
import { useKarelRunner } from '@features/karel/hooks/use-karel-runner'
import { useIsMobile } from '@features/karel/hooks/use-is-mobile'
import { GameHelpDialog } from '@features/karel/components/GameHelpDialog'
import { hasSeenLevelHelp, markLevelHelpSeen, TUTORIAL_COPY, TUTORIAL_STEPS } from '@features/karel/editor/tutorial'
import type { TutorialStep } from '@features/karel/editor/tutorial'
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
  const [codeHistory, setCodeHistory] = useState<{ past: string[]; future: string[] }>({
    past: [],
    future: [],
  })
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showObjective, setShowObjective] = useState(() => !hasSeenLevelHelp(activeLevel.id))
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(
    () => activeLevel.id === 1 && !hasSeenLevelHelp(activeLevel.id) ? 'chat' : null,
  )
  const isMobile = useIsMobile()
  const runner = useKarelRunner(activeLevel.initialWorld)
  const isChatTutorialStep = tutorialStep === 'chat'
  const editorTutorialFocus = tutorialStep === 'code' || tutorialStep === 'runner' || tutorialStep === 'compile'
    ? tutorialStep
    : null
  const chatPrompt = isChatTutorialStep
    ? 'Conoce a Tivot: sera tu guia de apoyo para aprender a programar paso a paso durante este reto.'
    : activeLevel.objective

  useEffect(() => {
    document.documentElement.classList.add('game-viewport-active')
    return () => document.documentElement.classList.remove('game-viewport-active')
  }, [])

  useEffect(() => {
    setCode(activeLevel.starterCode)
    setCodeHistory({ past: [], future: [] })
    setIsChatOpen(false)
    setShowObjective(!hasSeenLevelHelp(activeLevel.id))
    setTutorialStep(activeLevel.id === 1 && !hasSeenLevelHelp(activeLevel.id) ? 'chat' : null)
    runner.resetExecution()
  }, [activeLevel])

  const advanceTutorial = () => {
    if (!tutorialStep) return

    const currentIndex = TUTORIAL_STEPS.indexOf(tutorialStep)
    const nextStep = TUTORIAL_STEPS[currentIndex + 1] ?? null
    setTutorialStep(nextStep)
    setShowObjective(false)
    if (!nextStep) markLevelHelpSeen(activeLevel.id)
  }

  const previousTutorial = () => {
    if (!tutorialStep) return
    const currentIndex = TUTORIAL_STEPS.indexOf(tutorialStep)
    setTutorialStep(TUTORIAL_STEPS[Math.max(0, currentIndex - 1)] ?? 'chat')
  }

  const dismissTutorial = () => {
    setTutorialStep(null)
    setShowObjective(false)
    markLevelHelpSeen(activeLevel.id)
  }

  const openHelp = () => {
    if (runner.isRunning) runner.pauseExecution()
    setShowObjective(true)
  }

  const resetCodeAndWorld = () => {
    if (code !== activeLevel.starterCode) {
      setCodeHistory((history) => ({
        past: [...history.past, code].slice(-50),
        future: [],
      }))
    }
    setCode(activeLevel.starterCode)
    runner.resetExecution()
  }

  const handleCodeChange = (nextCode: string) => {
    if (nextCode === code) return
    setCodeHistory((history) => ({
      past: [...history.past, code].slice(-50),
      future: [],
    }))
    setCode(nextCode)
    if (!runner.isRunning) runner.resetExecution()
  }

  const undoCodeChange = () => {
    if (runner.isRunning || codeHistory.past.length === 0) return
    const previousCode = codeHistory.past[codeHistory.past.length - 1]
    if (previousCode === undefined) return
    setCodeHistory((history) => ({
      past: history.past.slice(0, -1),
      future: [code, ...history.future].slice(0, 50),
    }))
    setCode(previousCode)
    runner.resetExecution()
  }

  const redoCodeChange = () => {
    if (runner.isRunning || codeHistory.future.length === 0) return
    const nextCode = codeHistory.future[0]
    if (nextCode === undefined) return
    setCodeHistory((history) => ({
      past: [...history.past, code].slice(-50),
      future: history.future.slice(1),
    }))
    setCode(nextCode)
    runner.resetExecution()
  }

  return (
    <section className={`karel-workspace ${tutorialStep ? 'karel-workspace-tutorial' : ''}`}>
      {tutorialStep && !isMobile && <div className="tutorial-backdrop" aria-hidden="true" />}
      <header className="karel-game-header">
        <button className="workspace-back-button" type="button" onClick={onBackToLevels} aria-label="Volver a niveles">
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <div className="workspace-level-copy">
          <span className="workspace-level-badge">{activeLevel.mode === 'challenge' ? 'Desafío' : `Nivel ${activeLevel.id}`}</span>
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
        isMobile={isMobile}
        onHelp={openHelp}
        onChange={handleCodeChange}
        onUndo={undoCodeChange}
        onRedo={redoCodeChange}
        canUndo={codeHistory.past.length > 0}
        canRedo={codeHistory.future.length > 0}
        onCompile={() => runner.compileCode(code)}
        onRun={() => runner.runCode(code)}
        onReset={resetCodeAndWorld}
        onPauseToggle={runner.togglePause}
        onStepBack={runner.stepBack}
        onStepForward={() => runner.stepForward(code)}
        onSpeedChange={runner.setSpeedMultiplier}
        tutorialFocus={isMobile ? null : editorTutorialFocus}
        onTutorialNext={advanceTutorial}
        onTutorialPrevious={previousTutorial}
        onTutorialDismiss={dismissTutorial}
      />

      <FloatingChatDrawer
        session={session}
        query={query}
        isResponding={isResponding}
        isOpen={isChatOpen}
        objective={chatPrompt}
        showObjective={!isMobile && (isChatTutorialStep || showObjective)}
        isIntroPrompt={isChatTutorialStep}
        onContinueIntro={advanceTutorial}
        onDismissIntro={dismissTutorial}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
        onDismissObjective={dismissTutorial}
        onQueryChange={onQueryChange}
        onSubmitMessage={onSubmitMessage}
        onSelectQuickReply={onSelectQuickReply}
        onSubmitFlowOrder={onSubmitFlowOrder}
      />

      <GameHelpDialog
        isOpen={isMobile && (showObjective || tutorialStep !== null)}
        title={tutorialStep ? TUTORIAL_COPY[tutorialStep].title : 'Objetivo del nivel'}
        onClose={dismissTutorial}
      >
        {tutorialStep && (
          <p className="game-help-progress">Paso {TUTORIAL_STEPS.indexOf(tutorialStep) + 1} de {TUTORIAL_STEPS.length}</p>
        )}
        {(!tutorialStep || tutorialStep === 'chat') && (
          <p className="game-help-objective">{activeLevel.objective}</p>
        )}
        <p>{tutorialStep ? TUTORIAL_COPY[tutorialStep].body : 'Selecciona una línea y pulsa un comando para insertarlo. Usa las flechas para ordenar tu programa y la papelera para borrar. Ejecutar comprueba el código y corre las instrucciones en ese mismo orden.'}</p>
        {tutorialStep ? (
          <div className="tutorial-popover-actions">
            <button className="tutorial-skip-button" type="button" onClick={dismissTutorial}>Omitir</button>
            {tutorialStep !== 'chat' && (
              <button className="tutorial-skip-button" type="button" onClick={previousTutorial}>Anterior</button>
            )}
            <button className="tutorial-next-button" type="button" onClick={advanceTutorial}>
              {tutorialStep === 'compile' ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        ) : (
          <div className="game-help-actions">
            <button className="tutorial-skip-button" type="button" onClick={() => setTutorialStep('chat')}>Ver tutorial</button>
            <button className="tutorial-next-button" type="button" onClick={dismissTutorial}>Entendido</button>
          </div>
        )}
      </GameHelpDialog>
    </section>
  )
}
