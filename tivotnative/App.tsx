import { LinearGradient } from 'expo-linear-gradient'
import * as ScreenOrientation from 'expo-screen-orientation'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeft, Lightbulb, MessageCircle } from 'lucide-react-native'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, AppState, BackHandler, Dimensions, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { ChatPanel } from './src/components/ChatPanel'
import { GameHelpDialog } from './src/components/GameHelpDialog'
import { KarelBoard } from './src/components/KarelBoard'
import { KarelCodeEditor } from './src/components/KarelCodeEditor'
import { LevelSelectScreen } from './src/components/LevelSelectScreen'
import { ChallengeExitDialog, LevelCompletionOverlay } from './src/components/LevelCompletionOverlay'
import { SavedChallengesScreen } from './src/components/SavedChallengesScreen'
import { StartScreen } from './src/components/StartScreen'
import { IconButton, createTabletMetrics, colors, type TabletMetrics } from './src/components/ui'
import { useTivotAiContext, useTivotChat } from './src/features/chat/hooks'
import { codeHistoryReducer, createCodeHistory, type CodeHistoryAction } from './src/features/karel/editor/code-history'
import { createProgramFromSuggestion } from './src/features/karel/editor/suggested-code'
import { getInitialTutorialStepForLevel, getTutorialStepsForLevel, hasSeenLevelHelp, markLevelHelpSeen, type TutorialStep } from './src/features/karel/editor/tutorial'
import { buildExecution, useKarelRunner } from './src/features/karel/hooks/use-karel-runner'
import { describeMissingGoal, getTotalLevelBeepers, isLevelGoalComplete } from './src/features/karel/goals/level-goal'
import { deleteSavedChallenge, loadSavedChallenges, renameSavedChallenge, saveChallenge } from './src/features/karel/storage/saved-challenges'
import { createKarelChallenge, getKarelLevelById } from './src/shared/catalog'
import type { KarelLevel, KarelWorldState, SavedChallengeGame, TivotExecutionSnapshot } from './src/shared/types'

type AppScreen = 'START' | 'LEVEL_SELECT' | 'SAVED_GAMES' | 'WORKSPACE'

export default function App() {
  return <SafeAreaProvider><TabletApp /></SafeAreaProvider>
}

function TabletApp() {
  const windowDimensions = useWindowDimensions()
  // Android shrinks the window and safe-area frame when its keyboard opens.
  // Physical screen dimensions still follow rotation without producing a false landscape layout.
  const nativeScreenDimensions = Dimensions.get('screen')
  const { width, height } = Platform.OS === 'web' ? windowDimensions : nativeScreenDimensions
  const metrics = useMemo(() => createTabletMetrics(width, height), [width, height])
  const [screen, setScreen] = useState<AppScreen>('START')
  const [activeLevel, setActiveLevel] = useState<KarelLevel | null>(null)
  const [savedGames, setSavedGames] = useState<SavedChallengeGame[]>([])
  const chat = useTivotChat(activeLevel)
  useEffect(() => {
    const lockPortrait = () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined)
    }
    lockPortrait()
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') lockPortrait()
    })
    return () => subscription.remove()
  }, [])
  useEffect(() => { void loadSavedChallenges().then(setSavedGames) }, [])
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'START') return false
      if (screen === 'WORKSPACE') return false
      setScreen(screen === 'SAVED_GAMES' ? 'LEVEL_SELECT' : 'START')
      return true
    })
    return () => subscription.remove()
  }, [screen])
  return (
    <LinearGradient colors={['#f7f2ea', '#f1ece3', '#ece5da']} style={styles.fill}>
      <GridBackdrop width={width} height={height} />
      <SafeAreaView style={[styles.fill, screen === 'WORKSPACE' && !metrics.isLandscape && styles.portraitShell]}>
        <StatusBar style="dark" />
        {screen === 'START' && <StartScreen metrics={metrics} onStart={() => setScreen('LEVEL_SELECT')} />}
        {screen === 'LEVEL_SELECT' && <LevelSelectScreen metrics={metrics} onBack={() => setScreen('START')}
          onViewSavedGames={() => setScreen('SAVED_GAMES')}
          onSelectLevel={level => { setActiveLevel(level); setScreen('WORKSPACE') }} />}
        {screen === 'SAVED_GAMES' && <SavedChallengesScreen games={savedGames} onBack={() => setScreen('LEVEL_SELECT')}
          onLoad={game => { setActiveLevel(game.level); setScreen('WORKSPACE') }}
          onRename={(id, name) => { void renameSavedChallenge(id, name).then(setSavedGames) }}
          onDelete={id => { void deleteSavedChallenge(id).then(setSavedGames) }} />}
        {screen === 'WORKSPACE' && activeLevel && (
          <WorkspaceScreen key={activeLevel.id} metrics={metrics} activeLevel={activeLevel} chat={chat}
            onBackToLevels={() => setScreen('LEVEL_SELECT')}
            onNextLevel={() => {
              const next = activeLevel.id < 4 ? getKarelLevelById(activeLevel.id + 1) : createKarelChallenge()
              if (next) setActiveLevel(next)
            }}
            onNewChallenge={() => setActiveLevel(createKarelChallenge())}
            onSaveChallenge={async (level, world, code) => {
              await saveChallenge(level, world, code)
              setSavedGames(await loadSavedChallenges())
            }} />
        )}
      </SafeAreaView>
    </LinearGradient>
  )
}

function WorkspaceScreen({ metrics, activeLevel, chat, onBackToLevels, onNextLevel, onNewChallenge, onSaveChallenge }: {
  metrics: TabletMetrics; activeLevel: KarelLevel; chat: ReturnType<typeof useTivotChat>; onBackToLevels: () => void
  onNextLevel: () => void; onNewChallenge: () => void
  onSaveChallenge: (level: KarelLevel, world: KarelWorldState, code: string) => Promise<void>
}) {
  const [history, dispatch] = useReducer(codeHistoryReducer, activeLevel.starterCode, createCodeHistory)
  const [isChatOpen, setChatOpen] = useState(false)
  const [isKeyboardOpen, setKeyboardOpen] = useState(false)
  const [isApplyingCode, setIsApplyingCode] = useState(false)
  const [executionAttempts, setExecutionAttempts] = useState(0)
  const [lastExecution, setLastExecution] = useState<TivotExecutionSnapshot>({
    state: 'not_run', message: 'Todavía no se ha probado el código en este nivel.', line: null, attempts: 0,
  })
  const [codeFeedback, setCodeFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [exitPromptOpen, setExitPromptOpen] = useState(false)
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
  const bagPulse = useRef(new Animated.Value(1)).current
  const showBag = activeLevel.id === 4 || activeLevel.id === 5 || activeLevel.mode === 'challenge'
  const totalBeepers = getTotalLevelBeepers(activeLevel)
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
    let mounted = true
    let animation: Animated.CompositeAnimation | null = null
    void AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (!mounted || reduceMotion || !showBag) return
      animation = Animated.loop(Animated.sequence([
        Animated.timing(bagPulse, { toValue: 1.1, duration: 360, useNativeDriver: true }),
        Animated.timing(bagPulse, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.delay(720),
      ]))
      animation.start()
    })
    return () => {
      mounted = false
      animation?.stop()
      bagPulse.setValue(1)
    }
  }, [bagPulse, showBag])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') pauseRef.current()
    })
    return () => subscription.remove()
  }, [])
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true))
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false))
    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])
  useEffect(() => () => {
    if (applyCodeTimerRef.current) clearTimeout(applyCodeTimerRef.current)
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
  }, [])
  useEffect(() => {
    if (executionAttempts === 0) return
    // runCurrentCode already records the running state. Avoid writing a new
    // snapshot for every animated step; that creates a passive update chain.
    if (runner.isRunning) return
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
    if (runner.isPaused) {
      setLastExecution({ state: 'paused', message: 'La prueba está en pausa.', line: runner.activeLineNumber, attempts: executionAttempts })
      return
    }
    if (runner.compileResult?.success && runner.steps.length > 0 && runner.currentStepIndex === runner.steps.length - 1) {
      const goalComplete = isLevelGoalComplete(activeLevel, runner.worldState, runner.steps)
      setLastExecution({ state: 'completed', message: goalComplete ? '¡Objetivo cumplido! El nivel está completado.' : describeMissingGoal(activeLevel, runner.worldState), line: null, attempts: executionAttempts })
      if (goalComplete) setCompletionOpen(true)
    }
  }, [
    executionAttempts, runner.activeLineNumber, runner.compileResult, runner.currentStepIndex,
    runner.executionError, runner.isPaused, runner.isRunning, runner.steps.length, activeLevel, runner.worldState,
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
  const openChat = () => {
    runner.pauseExecution()
    setChatOpen(true)
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
  const requestExit = () => {
    runner.pauseExecution()
    if (activeLevel.mode === 'challenge') setExitPromptOpen(true)
    else onBackToLevels()
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { requestExit(); return true })
    return () => subscription.remove()
  })
  const portrait = !metrics.isLandscape
  const chatUsesKeyboardViewport = isChatOpen && isKeyboardOpen
  const boardWidth = portrait
    ? Math.max(130, Math.min(metrics.width - 16, availableHeight * 0.36, 520))
    : Math.min(350, metrics.width * 0.25)
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View testID={portrait ? 'workspace-portrait' : 'workspace-landscape'}
        onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)}
        style={[styles.workspace, portrait && styles.workspacePortrait]}>
        {!chatUsesKeyboardViewport && <View style={styles.header}>
          <IconButton label="Volver a niveles" onPress={requestExit}><ArrowLeft size={18} color={colors.muted} /></IconButton>
          <View style={styles.levelCopy}>
            <Text style={styles.levelBadge}>{activeLevel.mode === 'challenge' ? 'Desafío' : 'Nivel ' + activeLevel.id}</Text>
            <View style={styles.levelTitleRow}>
              <Text numberOfLines={2} style={styles.levelTitle}>{activeLevel.title.replace(/^Nivel \d+: /, '')}</Text>
              {showBag && (
                <View accessibilityLabel={'Mochila: ' + runner.worldState.bagBeepers + ' de ' + totalBeepers + ' fichas'} style={styles.bag}>
                  <Animated.Text aria-hidden style={[styles.bagEmoji, { transform: [{ scale: bagPulse }] }]}>🎒</Animated.Text>
                  <Text testID="bag-count" style={styles.bagCount}>{runner.worldState.bagBeepers}/{totalBeepers}</Text>
                </View>
              )}
            </View>
          </View>
          {portrait && <IconButton label="Objetivos y tutorial" onPress={openHelp}><Lightbulb size={18} color={colors.accentStrong} /></IconButton>}
          <IconButton label={isChatOpen ? 'Cerrar chat tutor' : 'Abrir chat tutor'} onPress={() => isChatOpen ? setChatOpen(false) : openChat()} style={styles.chatButton}>
            <MessageCircle size={22} color={colors.accentStrong} />
          </IconButton>
        </View>}
        <View style={[styles.body, portrait && styles.bodyPortrait, chatUsesKeyboardViewport && styles.keyboardChatBody]}>
          {!chatUsesKeyboardViewport && <View style={[styles.boardPane, { width: boardWidth }, portrait && styles.boardPortrait]}><KarelBoard world={runner.worldState} goal={activeLevel.goal.position} isRunning={runner.isRunning} hasError={Boolean(runner.executionError || runner.compileResult?.error)} wallCollision={Boolean(runner.executionError?.includes('muro'))} /></View>}
          {isChatOpen ? (
            <View accessibilityLabel="Chat tutor de Karel" style={[styles.chatPane, chatUsesKeyboardViewport && styles.keyboardChatPane]}>
              <ChatPanel session={chat.activeSession} query={chat.query} isResponding={chat.isResponding}
                onClose={() => setChatOpen(false)} onQueryChange={chat.setQuery}
                onSubmitMessage={() => chat.submitMessage(aiContext)}
                onSelectQuickReply={option => chat.submitQuickReply(option, aiContext)}
                onSubmitFlowOrder={chat.submitFlowOrder} onApplySuggestedCode={applySuggestedCode}
                onResetConversation={chat.resetLevelChat} />
            </View>
          ) : (
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
          )}
        </View>
        <GameHelpDialog visible={helpOpen && editorTutorialFocus === null} portrait={portrait} levelId={activeLevel.id} objective={activeLevel.objective} step={tutorialStep}
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
        <LevelCompletionOverlay visible={completionOpen} challenge={activeLevel.mode === 'challenge'}
          onClose={() => setCompletionOpen(false)}
          onPrimary={activeLevel.mode === 'challenge' ? onNewChallenge : onNextLevel}
          onSecondary={() => {
            if (activeLevel.mode === 'challenge') {
              // A completed run has no remaining fichas. Save the session's starting
              // layout so reopening a won challenge keeps its original ficha positions.
              void onSaveChallenge(activeLevel, activeLevel.initialWorld, history.code).then(onBackToLevels)
              return
            }
            onBackToLevels()
          }} />
        <ChallengeExitDialog visible={exitPromptOpen} onCancel={() => setExitPromptOpen(false)} onExit={onBackToLevels}
          onSaveAndExit={() => { void onSaveChallenge(activeLevel, runner.worldState, history.code).then(onBackToLevels) }} />
      </View>
    </KeyboardAvoidingView>
  )
}

function GridBackdrop({ width, height }: { width: number; height: number }) {
  const columns = Math.ceil(width / 74) + 1
  const rows = Math.ceil(height / 74) + 1
  return (
    <View pointerEvents="none" style={styles.gridBackdrop}>
      {Array.from({ length: columns }, (_, index) => (
        <View key={'column-' + index} style={[styles.gridLineVertical, { left: index * 74 }]} />
      ))}
      {Array.from({ length: rows }, (_, index) => (
        <View key={'row-' + index} style={[styles.gridLineHorizontal, { top: index * 74 }]} />
      ))}
    </View>
  )
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  gridBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', opacity: 0.55 },
  gridLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(135, 151, 143, 0.16)' },
  gridLineHorizontal: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(135, 151, 143, 0.16)' },
  portraitShell: { backgroundColor: colors.mobileShell },
  workspace: { flex: 1, width: '100%', maxWidth: 1480, alignSelf: 'center', padding: 20, gap: 16 },
  workspacePortrait: { padding: 0, gap: 6 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  levelCopy: { flex: 1, minWidth: 0, gap: 2 },
  levelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  levelBadge: { color: colors.accentStrong, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  levelTitle: { flexShrink: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  reset: { borderRadius: 22 },
  bag: { minWidth: 46, height: 26, paddingHorizontal: 7, borderRadius: 13, borderWidth: 1, borderColor: '#9cebc8', backgroundColor: '#effdf7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  bagEmoji: { fontSize: 16, lineHeight: 19, textAlign: 'center' },
  bagCount: { color: colors.accentStrong, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  chatButton: { width: 44, height: 44, borderRadius: 22, borderColor: '#84d7b7', shadowColor: '#10b981', shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  body: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 },
  bodyPortrait: { flexDirection: 'column', gap: 6 },
  keyboardChatBody: { gap: 0 },
  boardPane: { alignSelf: 'flex-start', flexShrink: 0 },
  boardPortrait: { alignSelf: 'center' },
  chatPane: {
    flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', borderWidth: 1,
    borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel,
  },
  keyboardChatPane: { borderWidth: 0, borderRadius: 0 },
  codeFeedback: {
    position: 'absolute', left: 16, right: 16, bottom: 18, zIndex: 40, alignSelf: 'center',
    maxWidth: 440, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 9,
    shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 10,
  },
  codeFeedbackSuccess: { borderColor: '#34d399', backgroundColor: '#065f46' },
  codeFeedbackError: { borderColor: '#f87171', backgroundColor: '#7f1d1d' },
  codeFeedbackText: { color: '#ecfdf5', fontSize: 13, fontWeight: '800', textAlign: 'center' },
})
