import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Lightbulb } from 'lucide-react'
import type { KarelLevel, KarelWorldState, TivotAiContext, TivotChatSession, TivotExecutionSnapshot } from '@shared/types'
import { KarelCodeEditor } from '@features/karel/components/KarelCodeEditor'
import { KarelGrid8x8 } from '@features/karel/components/KarelGrid8x8'
import { buildExecution, useKarelRunner } from '@features/karel/hooks/use-karel-runner'
import { useIsMobile } from '@features/karel/hooks/use-is-mobile'
import { createProgramFromSuggestion } from '@features/karel/editor/suggested-code'
import { GameHelpDialog } from '@features/karel/components/GameHelpDialog'
import { getInitialTutorialStepForLevel, getTutorialStepsForLevel, hasSeenLevelHelp, markLevelHelpSeen, TUTORIAL_COPY } from '@features/karel/editor/tutorial'
import type { TutorialStep } from '@features/karel/editor/tutorial'
import { useTivotAiContext } from '../hooks/use-tivot-ai-context'
import { FloatingChatDrawer } from './FloatingChatDrawer'
import { ChallengeExitDialog, LevelCompletionOverlay } from '@features/karel/components/LevelCompletionOverlay'
import { describeMissingGoal, getTotalLevelBeepers, isLevelGoalComplete } from '@features/karel/goals/level-goal'
import { useTelemetry } from '@features/telemetry/hooks/useTelemetry'
import type { ErrorCategory } from '../../../types/telemetry'

interface ChatWorkspaceProps {
  session: TivotChatSession | null
  activeLevel: KarelLevel
  query: string
  isResponding: boolean
  onQueryChange: (query: string) => void
  onSubmitMessage: (aiContext: TivotAiContext) => Promise<void>
  onSelectQuickReply: (optionText: string, aiContext: TivotAiContext) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
  onResetConversation: () => void
  onBackToLevels: () => void
  onNextLevel: () => void
  onNewChallenge: () => void
  onSaveChallenge: (level: KarelLevel, world: KarelWorldState, code: string) => void
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
  onResetConversation,
  onBackToLevels,
  onNextLevel,
  onNewChallenge,
  onSaveChallenge,
}: ChatWorkspaceProps) {
  const [code, setCode] = useState(activeLevel.starterCode)
  const [codeHistory, setCodeHistory] = useState<{ past: string[]; future: string[] }>({
    past: [],
    future: [],
  })
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isApplyingCode, setIsApplyingCode] = useState(false)
  const [executionAttempts, setExecutionAttempts] = useState(0)
  const [lastExecution, setLastExecution] = useState<TivotExecutionSnapshot>({
    state: 'not_run',
    message: 'Todavía no se ha probado el código en este nivel.',
    line: null,
    attempts: 0,
  })
  const [codeFeedback, setCodeFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [exitPromptOpen, setExitPromptOpen] = useState(false)
  const applyCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialTutorialStep = !hasSeenLevelHelp(activeLevel.id)
    ? getInitialTutorialStepForLevel(activeLevel.id)
    : null
  const [showObjective, setShowObjective] = useState(() => !hasSeenLevelHelp(activeLevel.id) && initialTutorialStep === null)
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(
    () => initialTutorialStep,
  )
  const isMobile = useIsMobile()
  const telemetry = useTelemetry()
  const levelStartTimeRef = useRef(Date.now())
  const runner = useKarelRunner(activeLevel.initialWorld)
  const aiContext = useTivotAiContext({
    level: activeLevel,
    world: runner.worldState,
    code,
    lastExecution,
  })
  const isChatTutorialStep = tutorialStep === 'chat'
  const tutorialSteps = getTutorialStepsForLevel(activeLevel.id)
  const editorTutorialFocus = tutorialStep === 'quickCommands' ? tutorialStep : null
  const showBag = activeLevel.id === 4 || activeLevel.id === 5 || activeLevel.mode === 'challenge'
  const totalBeepers = getTotalLevelBeepers(activeLevel)
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
    setIsApplyingCode(false)
    setExecutionAttempts(0)
    setLastExecution({
      state: 'not_run',
      message: 'Todavía no se ha probado el código en este nivel.',
      line: null,
      attempts: 0,
    })
    setCodeFeedback(null)
    setCompletionOpen(false)
    setExitPromptOpen(false)
    if (applyCodeTimerRef.current) clearTimeout(applyCodeTimerRef.current)
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    const nextTutorialStep = !hasSeenLevelHelp(activeLevel.id)
      ? getInitialTutorialStepForLevel(activeLevel.id)
      : null
    setShowObjective(!hasSeenLevelHelp(activeLevel.id) && nextTutorialStep === null)
    setTutorialStep(nextTutorialStep)
    runner.resetExecution()
    levelStartTimeRef.current = Date.now()
    telemetry.recordLevelStart(activeLevel.id)
  }, [activeLevel])

  useEffect(
    () => () => {
      if (applyCodeTimerRef.current) clearTimeout(applyCodeTimerRef.current)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (executionAttempts === 0) return
    // runCurrentCode already records the running state. Avoid writing a new
    // snapshot for every animated step; that creates a passive update chain.
    if (runner.isRunning) return

    if (runner.executionError) {
      setLastExecution({
        state: 'error',
        message: runner.executionError,
        line: runner.activeLineNumber,
        attempts: executionAttempts,
      })
      // Telemetry: Classify runtime errors
      const errCategory: ErrorCategory = runner.executionError.includes('muro') || runner.executionError.includes('fichas') || runner.executionError.includes('mochila')
        ? 'RUNTIME_EXCEPTION'
        : 'RUNTIME_EXCEPTION'
      telemetry.recordCodeExecution(activeLevel.id, executionAttempts, false, errCategory, runner.executionError.slice(0, 250), code)
      return
    }

    if (runner.compileResult?.error) {
      setLastExecution({
        state: 'error',
        message: `El código necesita un ajuste en la línea ${runner.compileResult.error.line}: ${runner.compileResult.error.message}`,
        line: runner.compileResult.error.line,
        attempts: executionAttempts,
      })
      // Telemetry: Compile/syntax error
      telemetry.recordCodeExecution(activeLevel.id, executionAttempts, false, 'SYNTAX_ERROR', runner.compileResult.error.message.slice(0, 250), code)
      return
    }

    if (runner.isPaused) {
      setLastExecution({
        state: 'paused',
        message: 'La prueba está en pausa.',
        line: runner.activeLineNumber,
        attempts: executionAttempts,
      })
      return
    }

    if (
      runner.compileResult?.success &&
      runner.steps.length > 0 &&
      runner.currentStepIndex === runner.steps.length - 1
    ) {
      const goalComplete = isLevelGoalComplete(activeLevel, runner.worldState, runner.steps)
      setLastExecution({
        state: 'completed',
        message: goalComplete ? '¡Objetivo cumplido! El nivel está completado.' : describeMissingGoal(activeLevel, runner.worldState),
        line: null,
        attempts: executionAttempts,
      })

      if (goalComplete) {
        // Telemetry: Successful execution + level complete
        const activeTimeMs = Date.now() - levelStartTimeRef.current
        telemetry.recordCodeExecution(activeLevel.id, executionAttempts, true, undefined, undefined, code)
        telemetry.recordLevelComplete(activeLevel.id, executionAttempts, activeTimeMs)
        setCompletionOpen(true)
      } else {
        // Telemetry: Code ran but didn't meet goal = logic/incomplete algorithm error
        const errCategory: ErrorCategory = runner.worldState.beepers.some(b => b.count > 0) && activeLevel.goal.requireAllBeepers
          ? 'LOGIC_BUSINESS_RULE'
          : 'INCOMPLETE_ALGORITHM'
        telemetry.recordCodeExecution(activeLevel.id, executionAttempts, false, errCategory, describeMissingGoal(activeLevel, runner.worldState).slice(0, 250), code)
      }
    }
  }, [
    executionAttempts,
    runner.activeLineNumber,
    runner.compileResult,
    runner.currentStepIndex,
    runner.executionError,
    runner.isPaused,
    runner.isRunning,
    runner.steps.length,
    activeLevel,
    runner.worldState,
  ])

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

  const showCodeFeedback = (kind: 'success' | 'error', message: string) => {
    setCodeFeedback({ kind, message })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setCodeFeedback(null), 2600)
  }

  const applySuggestedCode = (suggestedCode: string[]) => {
    if (isApplyingCode || runner.isRunning) return

    setIsChatOpen(false)
    setIsApplyingCode(true)
    if (applyCodeTimerRef.current) clearTimeout(applyCodeTimerRef.current)
    applyCodeTimerRef.current = setTimeout(() => {
      const nextCode = createProgramFromSuggestion(suggestedCode)
      const validation = nextCode ? buildExecution(nextCode, activeLevel.initialWorld).result : null

      if (!nextCode || !validation?.success) {
        setIsApplyingCode(false)
        showCodeFeedback('error', 'La sugerencia no tenía un formato válido. Pídele al tutor otro ejemplo.')
        return
      }

      handleCodeChange(nextCode)
      setIsApplyingCode(false)
      showCodeFeedback('success', '¡Código cargado en tu editor! Dale a ejecutar para probarlo.')
    }, 750)
  }

  const runCurrentCode = () => {
    if (isApplyingCode) return
    const nextAttempts = executionAttempts + 1
    setExecutionAttempts(nextAttempts)
    setLastExecution({
      state: 'running',
      message: 'El robot está probando el código ahora mismo.',
      line: null,
      attempts: nextAttempts,
    })
    runner.runCode(code)
  }

  const requestExit = () => {
    if (runner.isRunning) runner.pauseExecution()
    if (activeLevel.mode === 'challenge') setExitPromptOpen(true)
    else onBackToLevels()
  }

  const saveCurrentChallenge = () => onSaveChallenge(activeLevel, runner.worldState, code)

  return (
    <section className={`karel-workspace ${tutorialStep ? 'karel-workspace-tutorial' : ''}`}>
      <header className="karel-game-header">
        <button className="workspace-back-button" type="button" onClick={requestExit} aria-label="Volver a niveles">
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <div className="workspace-level-copy">
          <span className="workspace-level-badge">{activeLevel.mode === 'challenge' ? 'Desafío' : `Nivel ${activeLevel.id}`}</span>
          <div className="workspace-level-title-row">
            <h1>{activeLevel.title.replace(/^Nivel \d+: /, '')}</h1>
            {showBag && (
              <div
                className="workspace-bag-indicator is-pulsing"
                aria-label={`Mochila: ${runner.worldState.bagBeepers} de ${totalBeepers} fichas`}
                title={`Mochila: ${runner.worldState.bagBeepers} de ${totalBeepers} fichas`}
              >
                <span className="workspace-bag-emoji" aria-hidden="true">🎒</span>
                <span>{runner.worldState.bagBeepers}/{totalBeepers}</span>
              </div>
            )}
          </div>
        </div>
        <button className="workspace-back-button" type="button" onClick={openHelp} aria-label="Objetivos y tutorial" title="Objetivos y tutorial">
          <Lightbulb size={18} />
        </button>
      </header>

      <KarelGrid8x8 world={runner.worldState} goal={activeLevel.goal.position} isRunning={runner.isRunning} hasError={Boolean(runner.executionError || runner.compileResult?.error)} wallCollision={Boolean(runner.executionError?.includes('muro'))} />

      {!isChatOpen && <KarelCodeEditor
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
        isApplyingCode={isApplyingCode}
        speedMultiplier={runner.speedMultiplier}
        isMobile={isMobile}
        onHelp={openHelp}
        onChange={handleCodeChange}
        onUndo={undoCodeChange}
        onRedo={redoCodeChange}
        canUndo={codeHistory.past.length > 0}
        canRedo={codeHistory.future.length > 0}
        onRun={runCurrentCode}
        onReset={resetCodeAndWorld}
        onPauseToggle={runner.togglePause}
        onStepBack={runner.stepBack}
        onStepForward={() => runner.stepForward(code)}
        onSpeedChange={runner.setSpeedMultiplier}
        tutorialFocus={editorTutorialFocus}
        onTutorialNext={advanceTutorial}
        onTutorialPrevious={previousTutorial}
        onTutorialDismiss={dismissTutorial}
      />}

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
        onOpen={() => {
          runner.pauseExecution()
          setIsChatOpen(true)
        }}
        onClose={() => setIsChatOpen(false)}
        onDismissObjective={dismissTutorial}
        onQueryChange={onQueryChange}
        onSubmitMessage={() => onSubmitMessage(aiContext)}
        onSelectQuickReply={(optionText) => onSelectQuickReply(optionText, aiContext)}
        onSubmitFlowOrder={onSubmitFlowOrder}
        onApplySuggestedCode={applySuggestedCode}
        onResetConversation={onResetConversation}
      />

      {codeFeedback && (
        <div className={`code-feedback-toast code-feedback-toast-${codeFeedback.kind}`} role="status">
          {codeFeedback.message}
        </div>
      )}

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

      {completionOpen && (
        <LevelCompletionOverlay challenge={activeLevel.mode === 'challenge'}
          onClose={() => {
            setCompletionOpen(false)
            if (activeLevel.id === 4) telemetry.showSurvey()
          }}
          onPrimary={() => {
            setCompletionOpen(false)
            if (activeLevel.id === 4) telemetry.showSurvey()
            if (activeLevel.mode === 'challenge') onNewChallenge()
            else onNextLevel()
          }}
          onSecondary={() => {
            setCompletionOpen(false)
            if (activeLevel.id === 4) telemetry.showSurvey()
            if (activeLevel.mode === 'challenge') saveCurrentChallenge()
            onBackToLevels()
          }} />
      )}
      {exitPromptOpen && (
        <ChallengeExitDialog onCancel={() => setExitPromptOpen(false)} onExit={onBackToLevels}
          onSaveAndExit={() => { saveCurrentChallenge(); onBackToLevels() }} />
      )}
    </section>
  )
}
