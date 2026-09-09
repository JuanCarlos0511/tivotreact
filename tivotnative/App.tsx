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
import { useTivotChat } from './src/features/chat/hooks'
import { codeHistoryReducer, createCodeHistory, type CodeHistoryAction } from './src/features/karel/editor/code-history'
import { getInitialTutorialStepForLevel, getTutorialStepsForLevel, hasSeenLevelHelp, markLevelHelpSeen, type TutorialStep } from './src/features/karel/editor/tutorial'
import { useKarelRunner } from './src/features/karel/hooks/use-karel-runner'
import type { KarelLevel } from './src/shared/types'

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
  const initialTutorialStep = !hasSeenLevelHelp(activeLevel.id)
    ? getInitialTutorialStepForLevel(activeLevel.id)
    : null
  const [helpOpen, setHelpOpen] = useState(() => !hasSeenLevelHelp(activeLevel.id))
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(
    () => initialTutorialStep,
  )
  const [availableHeight, setAvailableHeight] = useState(metrics.height)
  const runner = useKarelRunner(activeLevel.initialWorld)
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
    if (runner.isRunning) return
    dispatch(action)
    runner.resetExecution()
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
          <KarelCodeEditor quickCommands={activeLevel.quickCommands} conditions={activeLevel.conditions} metrics={metrics} code={history.code} activeLineNumber={runner.activeLineNumber} activeLoops={runner.activeLoops}
            compileResult={runner.compileResult} executionError={runner.executionError}
            isRunning={runner.isRunning} isPaused={runner.isPaused} speedMultiplier={runner.speedMultiplier}
            onChange={code => changeCode({ type: 'change', code })}
            canUndo={history.past.length > 0} canRedo={history.future.length > 0}
            onUndo={() => changeCode({ type: 'undo' })} onRedo={() => changeCode({ type: 'redo' })}
            onRun={() => runner.runCode(history.code)}
            onReset={reset} onHelp={openHelp} onPauseToggle={runner.togglePause}
            onStepBack={runner.stepBack} onStepForward={() => runner.stepForward(history.code)}
            onSpeedChange={runner.setSpeedMultiplier} tutorialFocus={editorTutorialFocus}
            onTutorialNext={nextTutorial} onTutorialDismiss={closeHelp} />
        </View>
        <ResponsiveDialog visible={isChatOpen} onClose={() => setChatOpen(false)} label="Chat tutor de Karel"
          placement={portrait ? 'bottom' : 'right'} style={portrait ? styles.chatPortrait : undefined}>
          <ChatPanel session={chat.activeSession} query={chat.query} isResponding={chat.isResponding}
            onClose={() => setChatOpen(false)} onQueryChange={chat.setQuery} onSubmitMessage={chat.submitMessage}
            onSelectQuickReply={chat.submitQuickReply} onSubmitFlowOrder={chat.submitFlowOrder} />
        </ResponsiveDialog>
        <GameHelpDialog visible={helpOpen && editorTutorialFocus === null} portrait={portrait} objective={activeLevel.objective} step={tutorialStep}
          onClose={closeHelp} onNext={nextTutorial} onRestart={() => setTutorialStep(getInitialTutorialStepForLevel(activeLevel.id) ?? 'chat')}
          onPrevious={() => {
            if (tutorialStep) setTutorialStep(tutorialSteps[Math.max(0, tutorialSteps.indexOf(tutorialStep) - 1)] ?? tutorialSteps[0] ?? 'chat')
          }} />
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
})
