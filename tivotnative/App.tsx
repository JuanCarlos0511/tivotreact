import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeft, Backpack, Lightbulb, MessageCircle } from 'lucide-react-native'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AppState, BackHandler, KeyboardAvoidingView, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaProvider, SafeAreaView, useSafeAreaFrame } from 'react-native-safe-area-context'
import { ChatPanel } from './src/components/ChatPanel'
import { GameHelpDialog } from './src/components/GameHelpDialog'
import { KarelBoard } from './src/components/KarelBoard'
import { KarelCodeEditor } from './src/components/KarelCodeEditor'
import { LevelSelectScreen } from './src/components/LevelSelectScreen'
import { ResponsiveDialog } from './src/components/ResponsiveDialog'
import { StartScreen } from './src/components/StartScreen'
import { IconButton, createTabletMetrics, colors, type TabletMetrics } from './src/components/ui'
import { useTivotAiContext, useTivotChat } from './src/features/chat/hooks'
import { codeHistoryReducer, createCodeHistory, type CodeHistoryAction } from './src/features/karel/editor/code-history'
import { createProgramFromSuggestion } from './src/features/karel/editor/suggested-code'
import { getInitialTutorialStepForLevel, getTutorialStepsForLevel, hasSeenLevelHelp, markLevelHelpSeen, type TutorialStep } from './src/features/karel/editor/tutorial'
import { buildExecution, useKarelRunner } from './src/features/karel/hooks/use-karel-runner'
import type { KarelLevel, TivotExecutionSnapshot } from './src/shared/types'

type AppScreen = 'START' | 'LEVEL_SELECT' | 'WORKSPACE'

export default function App() {
  return <SafeAreaProvider><TabletApp /></SafeAreaProvider>
}

function TabletApp() {
  // The safe-area frame follows tablet rotation without switching layout when the keyboard resizes Android's window.
  const safeAreaFrame = useSafeAreaFrame()
  const windowDimensions = useWindowDimensions()
  const { width, height } = Platform.OS === 'web' ? windowDimensions : safeAreaFrame
  const metrics = useMemo(() => createTabletMetrics(width, height), [width, height])
  const [screen, setScreen] = useState<AppScreen>('START')
  const [activeLevel, setActiveLevel] = useState<KarelLevel | null>(null)
  const chat = useTivotChat(activeLevel)
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'START') return false
      setScreen(screen === 'WORKSPACE' ? 'LEVEL_SELECT' : 'START')
      return true
    })
    return () => subscription.remove()
  }, [screen])
  return (
    <LinearGradient colors={['#f7f2ea', '#f1ece3', '#ece5da']} style={styles.fill}>
      <SafeAreaView style={[styles.fill, screen === 'WORKSPACE' && !metrics.isLandscape && styles.portraitShell]}>
        <StatusBar style="dark" />
        {screen === 'START' && <StartScreen metrics={metrics} onStart={() => setScreen('LEVEL_SELECT')} />}
        {screen === 'LEVEL_SELECT' && <LevelSelectScreen metrics={metrics} onBack={() => setScreen('START')}
          onSelectLevel={level => { setActiveLevel(level); setScreen('WORKSPACE') }} />}
        {screen === 'WORKSPACE' && activeLevel && (
          <WorkspaceScreen key={activeLevel.id} metrics={metrics} activeLevel={activeLevel} chat={chat}
            onBackToLevels={() => setScreen('LEVEL_SELECT')} />
        )}
      </SafeAreaView>
    </LinearGradient>
  )
}

function WorkspaceScreen({ metrics, activeLevel, chat, onBackToLevels }: {
  metrics: TabletMetrics; activeLevel: KarelLevel; chat: ReturnType<typeof useTivotChat>; onBackToLevels: () => void
}) {
  const [history, dispatch] = useReducer(codeHistoryReducer, activeLevel.starterCode, createCodeHistory)
  const [isChatOpen, setChatOpen] = useState(false)
  const [isApplyingCode, setIsApplyingCode] = useState(false)
  const [executionAttempts, setExecutionAttempts] = useState(0)
  const [lastExecution, setLastExecution] = useState<TivotExecutionSnapshot>({
    state: 'not_run', message: 'Todavía no se ha probado el código en este nivel.', line: null, attempts: 0,
  })
  const [codeFeedback, setCodeFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const applyCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialTutorialStep = !hasSeenLevelHelp(activeLevel.id)
    ? getInitialTutorialStepForLevel(activeLevel.id)
    : null
  const [helpOpen, setHelpOpen] = useState(() => !hasSeenLevelHelp(activeLevel.id))
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(
    () => initialTutorialStep,
  )
  const [availableHeight, setAvailableHeight] = useState(metrics.height)
  const runner = useKarelRunner(activeLevel.initialWorld)
  const aiContext = useTivotAiContext({
    level: activeLevel,
    world: runner.worldState,
    code: history.code,
    lastExecution,
  })
  const tutorialSteps = getTutorialStepsForLevel(activeLevel.id)
  const editorTutorialFocus = tutorialStep === 'quickCommands' ? tutorialStep : null
  const pauseRef = useRef(runner.pauseExecution)
  pauseRef.current = runner.pauseExecution
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') pauseRef.current()
    })
    return () => subscription.remove()
  }, [])
  useEffect(() => () => {
    if (applyCodeTimerRef.current) clearTimeout(applyCodeTimerRef.current)
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
  }, [])
  useEffect(() => {
    if (executionAttempts === 0) return
    if (runner.executionError) {
      setLastExecution({ state: 'error', message: runner.executionError, line: runner.activeLineNumber, attempts: executionAttempts })
      return
    }
    if (runner.compileResult?.error) {
      setLastExecution({
        state: 'error',
        message: `El código necesita un ajuste en la línea ${runner.compileResult.error.line}: ${runner.compileResult.error.message}`,
        line: runner.compileResult.error.line,
        attempts: executionAttempts,
      })
      return
    }
    if (runner.isRunning) {
      setLastExecution({ state: 'running', message: 'El robot está probando el código ahora mismo.', line: runner.activeLineNumber, attempts: executionAttempts })
      return
    }
    if (runner.isPaused) {
      setLastExecution({ state: 'paused', message: 'La prueba está en pausa.', line: runner.activeLineNumber, attempts: executionAttempts })
      return
    }
    if (runner.compileResult?.success && runner.steps.length > 0 && runner.currentStepIndex === runner.steps.length - 1) {
      setLastExecution({ state: 'completed', message: 'El robot terminó todas las instrucciones sin chocar.', line: null, attempts: executionAttempts })
    }
  }, [
    executionAttempts, runner.activeLineNumber, runner.compileResult, runner.currentStepIndex,
    runner.executionError, runner.isPaused, runner.isRunning, runner.steps.length,
  ])
  const closeHelp = () => {
    setHelpOpen(false)
    setTutorialStep(null)
    markLevelHelpSeen(activeLevel.id)
  }
  const nextTutorial = () => {
    if (!tutorialStep) return
    const next = tutorialSteps[tutorialSteps.indexOf(tutorialStep) + 1] ?? null
    if (next) setTutorialStep(next)
    else closeHelp()
  }
  const openHelp = () => {
    runner.pauseExecution()
    setHelpOpen(true)
  }
  const changeCode = (action: CodeHistoryAction) => {
    if (runner.isRunning || isApplyingCode) return
    dispatch(action)
    runner.resetExecution()
  }
  const showCodeFeedback = (kind: 'success' | 'error', message: string) => {
    setCodeFeedback({ kind, message })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setCodeFeedback(null), 2600)
  }
  const applySuggestedCode = (suggestedCode: string[]) => {
    if (isApplyingCode || runner.isRunning) return
    setChatOpen(false)
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
      dispatch({ type: 'change', code: nextCode })
      runner.resetExecution()
      setIsApplyingCode(false)
      showCodeFeedback('success', '¡Código cargado en tu editor! Dale a ejecutar para probarlo.')
    }, 750)
  }
  const runCurrentCode = () => {
    if (isApplyingCode) return
    const nextAttempts = executionAttempts + 1
    setExecutionAttempts(nextAttempts)
    setLastExecution({ state: 'running', message: 'El robot está probando el código ahora mismo.', line: null, attempts: nextAttempts })
    runner.runCode(history.code)
  }
  const reset = runner.resetExecution
  const portrait = !metrics.isLandscape
  const boardWidth = portrait
    ? Math.max(130, Math.min(metrics.width - 32, availableHeight * (metrics.isTablet ? 0.36 : 0.28), 410))
    : Math.min(350, metrics.width * 0.25)
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View testID={portrait ? 'workspace-portrait' : 'workspace-landscape'}
        onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)}
        style={[styles.workspace, portrait && styles.workspacePortrait]}>
        <View style={styles.header}>
          <IconButton label="Volver a niveles" onPress={onBackToLevels}><ArrowLeft size={18} color={colors.muted} /></IconButton>
          <View style={styles.levelCopy}>
            <Text style={styles.levelBadge}>{activeLevel.mode === 'challenge' ? 'Desafío' : 'Nivel ' + activeLevel.id}</Text>
            <Text numberOfLines={2} style={styles.levelTitle}>{activeLevel.title.replace(/^Nivel \d+: /, '')}</Text>
          </View>
          {portrait && <IconButton label="Objetivos y tutorial" onPress={openHelp}><Lightbulb size={18} color={colors.accentStrong} /></IconButton>}
          <View accessibilityLabel={'Mochila: ' + runner.worldState.bagBeepers + ' fichas'} style={styles.bag}>
            <Backpack size={20} color={colors.accentStrong} />
            <Text testID="bag-count" style={styles.bagCount}>{runner.worldState.bagBeepers}</Text>
          </View>
          <IconButton label="Abrir chat tutor" onPress={() => setChatOpen(true)} style={styles.chatButton}>
            <MessageCircle size={22} color={colors.accentStrong} />
          </IconButton>
        </View>
        <View style={[styles.body, portrait && styles.bodyPortrait]}>
          <View style={[styles.boardPane, { width: boardWidth }, portrait && styles.boardPortrait]}><KarelBoard world={runner.worldState} isRunning={runner.isRunning} hasError={Boolean(runner.executionError || runner.compileResult?.error)} wallCollision={Boolean(runner.executionError?.includes('muro'))} /></View>
          <KarelCodeEditor levelId={activeLevel.id} quickCommands={activeLevel.quickCommands} conditions={activeLevel.conditions} metrics={metrics} code={history.code} activeLineNumber={runner.activeLineNumber} activeLoops={runner.activeLoops}
            compileResult={runner.compileResult} executionError={runner.executionError}
            isRunning={runner.isRunning} isPaused={runner.isPaused} isApplyingCode={isApplyingCode} speedMultiplier={runner.speedMultiplier}
            onChange={code => changeCode({ type: 'change', code })}
            canUndo={history.past.length > 0} canRedo={history.future.length > 0}
            onUndo={() => changeCode({ type: 'undo' })} onRedo={() => changeCode({ type: 'redo' })}
            onRun={runCurrentCode}
            onReset={reset} onHelp={openHelp} onPauseToggle={runner.togglePause}
            onStepBack={runner.stepBack} onStepForward={() => runner.stepForward(history.code)}
            onSpeedChange={runner.setSpeedMultiplier} tutorialFocus={editorTutorialFocus}
            onTutorialNext={nextTutorial} onTutorialDismiss={closeHelp} />
        </View>
        <ResponsiveDialog visible={isChatOpen} onClose={() => setChatOpen(false)} label="Chat tutor de Karel"
          placement={portrait ? 'bottom' : 'right'} style={portrait ? styles.chatPortrait : undefined}>
          <ChatPanel session={chat.activeSession} query={chat.query} isResponding={chat.isResponding}
            onClose={() => setChatOpen(false)} onQueryChange={chat.setQuery}
            onSubmitMessage={() => chat.submitMessage(aiContext)}
            onSelectQuickReply={option => chat.submitQuickReply(option, aiContext)}
            onSubmitFlowOrder={chat.submitFlowOrder} onApplySuggestedCode={applySuggestedCode}
            onResetConversation={chat.resetLevelChat} />
        </ResponsiveDialog>
        <GameHelpDialog visible={helpOpen && editorTutorialFocus === null} portrait={portrait} objective={activeLevel.objective} step={tutorialStep}
          onClose={closeHelp} onNext={nextTutorial} onRestart={() => setTutorialStep(getInitialTutorialStepForLevel(activeLevel.id) ?? 'chat')}
          onPrevious={() => {
            if (tutorialStep) setTutorialStep(tutorialSteps[Math.max(0, tutorialSteps.indexOf(tutorialStep) - 1)] ?? tutorialSteps[0] ?? 'chat')
          }} />
        {codeFeedback && (
          <View accessibilityLiveRegion="polite" style={[
            styles.codeFeedback,
            codeFeedback.kind === 'error' ? styles.codeFeedbackError : styles.codeFeedbackSuccess,
          ]}>
            <Text style={styles.codeFeedbackText}>{codeFeedback.message}</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  portraitShell: { backgroundColor: colors.mobileShell },
  workspace: { flex: 1, width: '100%', maxWidth: 1480, alignSelf: 'center', padding: 20, gap: 16 },
  workspacePortrait: { padding: 0, gap: 6 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  levelCopy: { flex: 1, minWidth: 0, gap: 2 },
  levelBadge: { color: colors.accentStrong, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  levelTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  reset: { borderRadius: 22 },
  bag: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#b8dfcf', backgroundColor: '#effbf5', alignItems: 'center', justifyContent: 'center' },
  bagCount: { position: 'absolute', right: -3, top: -3, minWidth: 18, minHeight: 18, paddingHorizontal: 3, borderRadius: 9, overflow: 'hidden', color: '#ffffff', backgroundColor: colors.accentStrong, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  chatButton: { width: 44, height: 44, borderRadius: 22, borderColor: '#84d7b7' },
  body: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 },
  bodyPortrait: { flexDirection: 'column', gap: 6 },
  boardPane: { alignSelf: 'flex-start', flexShrink: 0 },
  boardPortrait: { alignSelf: 'center' },
  chatPortrait: { height: '78%' },
  codeFeedback: {
    position: 'absolute', left: 16, right: 16, bottom: 18, zIndex: 40, alignSelf: 'center',
    maxWidth: 440, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 9,
    shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 10,
  },
  codeFeedbackSuccess: { borderColor: '#34d399', backgroundColor: '#065f46' },
  codeFeedbackError: { borderColor: '#f87171', backgroundColor: '#7f1d1d' },
  codeFeedbackText: { color: '#ecfdf5', fontSize: 13, fontWeight: '800', textAlign: 'center' },
})
