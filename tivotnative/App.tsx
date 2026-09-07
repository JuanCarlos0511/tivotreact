import * as ScreenOrientation from 'expo-screen-orientation'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeft } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { enableScreens } from 'react-native-screens'
import { ChatPanel } from './src/components/ChatPanel'
import { KarelBoard } from './src/components/KarelBoard'
import { KarelCodeEditor, type KarelTutorialFocus } from './src/components/KarelCodeEditor'
import { LevelSelectScreen } from './src/components/LevelSelectScreen'
import { StartScreen } from './src/components/StartScreen'
import { createTabletMetrics, colors } from './src/components/ui'
import { useTivotChat } from './src/features/chat/hooks'
import { useKarelRunner } from './src/features/karel/hooks/use-karel-runner'
import type { KarelLevel } from './src/shared/types'

enableScreens(true)

type AppScreen = 'START' | 'LEVEL_SELECT' | 'WORKSPACE'
type LevelOneTutorialStep = 'chat' | 'code' | 'runner' | 'compile'

const LEVEL_ONE_TUTORIAL_STEPS: LevelOneTutorialStep[] = ['chat', 'code', 'runner', 'compile']

export default function App() {
  const { width, height } = useWindowDimensions()
  const metrics = useMemo(() => createTabletMetrics(width, height), [width, height])
  const [screen, setScreen] = useState<AppScreen>('START')
  const [activeLevel, setActiveLevel] = useState<KarelLevel | null>(null)
  const chat = useTivotChat(activeLevel)

  useEffect(() => {
    void ScreenOrientation.unlockAsync()
  }, [])

  const handleSelectLevel = (level: KarelLevel) => {
    setActiveLevel(level)
    setScreen('WORKSPACE')
  }

  const handleBackToLevels = () => {
    setScreen('LEVEL_SELECT')
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.shell}>
            {screen === 'START' && <StartScreen metrics={metrics} onStart={() => setScreen('LEVEL_SELECT')} />}
            {screen === 'LEVEL_SELECT' && (
              <LevelSelectScreen metrics={metrics} onBack={() => setScreen('START')} onSelectLevel={handleSelectLevel} />
            )}
            {screen === 'WORKSPACE' && activeLevel && (
              <WorkspaceScreen
                metrics={metrics}
                activeLevel={activeLevel}
                session={chat.activeSession}
                query={chat.query}
                isResponding={chat.isResponding}
                onBackToLevels={handleBackToLevels}
                onQueryChange={chat.setQuery}
                onSubmitMessage={chat.submitMessage}
                onSelectQuickReply={chat.submitQuickReply}
                onSubmitFlowOrder={chat.submitFlowOrder}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

interface WorkspaceScreenProps {
  metrics: ReturnType<typeof createTabletMetrics>
  activeLevel: KarelLevel
  session: ReturnType<typeof useTivotChat>['activeSession']
  query: string
  isResponding: boolean
  onBackToLevels: () => void
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSelectQuickReply: (optionText: string) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
}

function WorkspaceScreen({
  metrics,
  activeLevel,
  session,
  query,
  isResponding,
  onBackToLevels,
  onQueryChange,
  onSubmitMessage,
  onSelectQuickReply,
  onSubmitFlowOrder,
}: WorkspaceScreenProps) {
  const [code, setCode] = useState(activeLevel.starterCode)
  const [tutorialStep, setTutorialStep] = useState<LevelOneTutorialStep | null>(
    activeLevel.id === 1 ? 'chat' : null,
  )
  const runner = useKarelRunner(activeLevel.initialWorld)
  const editorTutorialFocus: KarelTutorialFocus =
    tutorialStep === 'code' || tutorialStep === 'runner' || tutorialStep === 'compile' ? tutorialStep : null

  useEffect(() => {
    setCode(activeLevel.starterCode)
    setTutorialStep(activeLevel.id === 1 ? 'chat' : null)
    runner.resetExecution()
  }, [activeLevel])

  const advanceTutorial = () => {
    if (!tutorialStep) return

    const currentIndex = LEVEL_ONE_TUTORIAL_STEPS.indexOf(tutorialStep)
    setTutorialStep(LEVEL_ONE_TUTORIAL_STEPS[currentIndex + 1] ?? null)
  }

  const dismissTutorial = () => {
    setTutorialStep(null)
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
    <View style={styles.workspace}>
      <View style={styles.workspaceHeader}>
        <Pressable onPress={onBackToLevels} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft color={colors.muted} size={18} />
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
        <View style={styles.levelCopy}>
          <Text style={styles.levelBadge}>Nivel {activeLevel.id}</Text>
          <Text style={styles.levelTitle}>{activeLevel.title.replace(/^Nivel \d+: /, '')}</Text>
          <Text numberOfLines={2} style={styles.levelObjective}>
            {activeLevel.objective}
          </Text>
        </View>
      </View>

      <View style={[styles.workspaceBody, metrics.isLandscape && styles.workspaceBodyLandscape]}>
        <View
          style={[
            styles.activityPane,
            metrics.isLandscape && styles.activityPaneLandscape,
            tutorialStep === 'chat' && styles.dimmedTutorialSection,
            editorTutorialFocus && styles.raisedTutorialPane,
          ]}
        >
          <View style={editorTutorialFocus && styles.dimmedTutorialSection}>
            <KarelBoard metrics={metrics} world={runner.worldState} />
          </View>
          <KarelCodeEditor
            metrics={metrics}
            code={code}
            activeLineNumber={runner.activeLineNumber}
            compileResult={runner.compileResult}
            executionError={runner.executionError}
            isRunning={runner.isRunning}
            isPaused={runner.isPaused}
            speedMultiplier={runner.speedMultiplier}
            tutorialFocus={editorTutorialFocus}
            onChange={handleCodeChange}
            onCompile={() => runner.compileCode(code)}
            onRun={() => runner.runCode(code)}
            onReset={resetCodeAndWorld}
            onPauseToggle={runner.togglePause}
            onStepBack={runner.stepBack}
            onStepForward={() => runner.stepForward(code)}
            onSpeedChange={runner.setSpeedMultiplier}
            onTutorialNext={advanceTutorial}
            onTutorialDismiss={dismissTutorial}
          />
        </View>

        <View
          style={[
            styles.chatPane,
            metrics.isLandscape && styles.chatPaneLandscape,
            tutorialStep === 'chat' && styles.raisedTutorialPane,
            editorTutorialFocus && styles.dimmedTutorialSection,
          ]}
        >
          <ChatPanel
            metrics={metrics}
            session={session}
            query={query}
            isResponding={isResponding}
            tutorialActive={tutorialStep === 'chat'}
            onQueryChange={onQueryChange}
            onSubmitMessage={onSubmitMessage}
            onSelectQuickReply={onSelectQuickReply}
            onSubmitFlowOrder={onSubmitFlowOrder}
            onTutorialNext={advanceTutorial}
            onTutorialDismiss={dismissTutorial}
          />
        </View>
      </View>

      {tutorialStep && <View pointerEvents="none" style={styles.tutorialScrim} />}
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  workspace: {
    flex: 1,
    padding: 14,
    gap: 12,
    backgroundColor: colors.shell,
  },
  workspaceHeader: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: 'rgba(18, 23, 21, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  backButtonText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  levelCopy: {
    flex: 1,
    minWidth: 0,
  },
  levelBadge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  levelTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  levelObjective: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  workspaceBody: {
    flex: 1,
    minHeight: 0,
    gap: 12,
  },
  workspaceBodyLandscape: {
    flexDirection: 'row',
  },
  activityPane: {
    flex: 1,
    minHeight: 0,
    gap: 12,
  },
  activityPaneLandscape: {
    flex: 1.24,
  },
  chatPane: {
    flex: 0.72,
    minHeight: 260,
  },
  chatPaneLandscape: {
    flex: 0.76,
    maxWidth: 470,
    minHeight: 0,
  },
  raisedTutorialPane: {
    zIndex: 30,
  },
  dimmedTutorialSection: {
    opacity: 0.32,
  },
  tutorialScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.64)',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
})
