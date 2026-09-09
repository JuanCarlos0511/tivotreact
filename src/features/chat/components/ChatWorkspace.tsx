import { useEffect, useState } from 'react'
import { ArrowLeft, Backpack, Lightbulb } from 'lucide-react'
import type { KarelLevel, TivotChatSession } from '@shared/types'
import { KarelCodeEditor } from '@features/karel/components/KarelCodeEditor'
import { KarelGrid8x8 } from '@features/karel/components/KarelGrid8x8'
import { useKarelRunner } from '@features/karel/hooks/use-karel-runner'
import { useIsMobile } from '@features/karel/hooks/use-is-mobile'
import { GameHelpDialog } from '@features/karel/components/GameHelpDialog'
import { getInitialTutorialStepForLevel, getTutorialStepsForLevel, hasSeenLevelHelp, markLevelHelpSeen, TUTORIAL_COPY } from '@features/karel/editor/tutorial'
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
  const initialTutorialStep = !hasSeenLevelHelp(activeLevel.id)
    ? getInitialTutorialStepForLevel(activeLevel.id)
    : null
  const [showObjective, setShowObjective] = useState(() => !hasSeenLevelHelp(activeLevel.id) && initialTutorialStep === null)
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(
    () => initialTutorialStep,
  )
  const isMobile = useIsMobile()
  const runner = useKarelRunner(activeLevel.initialWorld)
  const isChatTutorialStep = tutorialStep === 'chat'
  const tutorialSteps = getTutorialStepsForLevel(activeLevel.id)
  const editorTutorialFocus = tutorialStep === 'quickCommands' ? tutorialStep : null
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
    const nextTutorialStep = !hasSeenLevelHelp(activeLevel.id)
      ? getInitialTutorialStepForLevel(activeLevel.id)
      : null
    setShowObjective(!hasSeenLevelHelp(activeLevel.id) && nextTutorialStep === null)
    setTutorialStep(nextTutorialStep)
    runner.resetExecution()
  }, [activeLevel])

  const advanceTutorial = () => {
    if (!tutorialStep) return

    const currentIndex = tutorialSteps.indexOf(tutorialStep)
    const nextStep = tutorialSteps[currentIndex + 1] ?? null
    setTutorialStep(nextStep)
    setShowObjective(false)
    if (!nextStep) markLevelHelpSeen(activeLevel.id)
  }

  const previousTutorial = () => {
    if (!tutorialStep) return
    const currentIndex = tutorialSteps.indexOf(tutorialStep)
    setTutorialStep(tutorialSteps[Math.max(0, currentIndex - 1)] ?? tutorialSteps[0] ?? 'chat')
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

  const resetCodeAndWorld = runner.resetExecution

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
      <header className="karel-game-header">
        <button className="workspace-back-button" type="button" onClick={onBackToLevels} aria-label="Volver a niveles">
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <div className="workspace-level-copy">
          <span className="workspace-level-badge">{activeLevel.mode === 'challenge' ? 'Desafío' : `Nivel ${activeLevel.id}`}</span>
          <div className="workspace-level-title-row">
            <h1>{activeLevel.title.replace(/^Nivel \d+: /, '')}</h1>
            {activeLevel.id >= 4 && (
              <div
                className="workspace-bag-indicator"
                aria-label={`Mochila: ${runner.worldState.bagBeepers} fichas`}
                title={`Mochila: ${runner.worldState.bagBeepers} fichas`}
              >
                <Backpack size={17} aria-hidden="true" />
                <span>{runner.worldState.bagBeepers}</span>
              </div>
            )}
          </div>
        </div>
        <button className="workspace-back-button" type="button" onClick={openHelp} aria-label="Objetivos y tutorial" title="Objetivos y tutorial">
          <Lightbulb size={18} />
        </button>
      </header>

      <KarelGrid8x8 world={runner.worldState} isRunning={runner.isRunning} hasError={Boolean(runner.executionError || runner.compileResult?.error)} wallCollision={Boolean(runner.executionError?.includes('muro'))} />

      <KarelCodeEditor
        levelId={activeLevel.id}
        quickCommands={activeLevel.quickCommands}
        conditions={activeLevel.conditions}
        code={code}
        activeLineNumber={runner.activeLineNumber}
        activeLoops={runner.activeLoops}
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
        onRun={() => runner.runCode(code)}
        onReset={resetCodeAndWorld}
        onPauseToggle={runner.togglePause}
        onStepBack={runner.stepBack}
        onStepForward={() => runner.stepForward(code)}
        onSpeedChange={runner.setSpeedMultiplier}
        tutorialFocus={editorTutorialFocus}
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
        showObjective={false}
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
        isOpen={showObjective || (tutorialStep !== null && editorTutorialFocus === null)}
        title={tutorialStep ? TUTORIAL_COPY[tutorialStep].title : 'Objetivo del nivel'}
        onClose={dismissTutorial}
      >
        {tutorialStep && (
          <p className="game-help-progress">Paso {tutorialSteps.indexOf(tutorialStep) + 1} de {tutorialSteps.length}</p>
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
              {tutorialStep === 'reset' ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        ) : (
          <div className="game-help-actions">
            <button className="tutorial-skip-button" type="button" onClick={() => setTutorialStep(getInitialTutorialStepForLevel(activeLevel.id) ?? 'chat')}>Ver tutorial</button>
            <button className="tutorial-next-button" type="button" onClick={dismissTutorial}>Entendido</button>
          </div>
        )}
      </GameHelpDialog>
    </section>
  )
}
