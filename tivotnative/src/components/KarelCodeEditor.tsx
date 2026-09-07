import { Pause, Play, RotateCcw, Send, StepBack, StepForward, Terminal } from 'lucide-react-native'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { CompileResult, KarelSpeedMultiplier } from '../features/karel/hooks/use-karel-runner'
import type { TabletMetrics } from './ui'
import { ActionButton, TutorialCallout, colors } from './ui'

export type KarelTutorialFocus = 'code' | 'runner' | 'compile' | null

interface KarelCodeEditorProps {
  metrics: TabletMetrics
  code: string
  activeLineNumber: number | null
  compileResult: CompileResult | null
  executionError: string | null
  isRunning: boolean
  isPaused: boolean
  speedMultiplier: KarelSpeedMultiplier
  tutorialFocus: KarelTutorialFocus
  onChange: (code: string) => void
  onCompile: () => void
  onRun: () => void
  onReset: () => void
  onPauseToggle: () => void
  onStepBack: () => void
  onStepForward: () => void
  onSpeedChange: (speedMultiplier: KarelSpeedMultiplier) => void
  onTutorialNext: () => void
  onTutorialDismiss: () => void
}

const QUICK_COMMANDS = ['avanza;', 'gira-izquierda;', 'coge-zumbador;', 'deja-zumbador;', 'apagate;'] as const

const TUTORIAL_COPY = {
  code: {
    title: 'Espacio de codigo',
    body: 'Escribe aqui las instrucciones de Karel. En este nivel, enfocate en avanzar paso a paso y terminar con apagate;.',
  },
  runner: {
    title: 'Controles paso a paso',
    body: 'Usa estos botones para revisar la ejecucion: retrocede, pausa, avanza un paso y ajusta la velocidad.',
  },
  compile: {
    title: 'Compilar y ejecutar',
    body: 'Primero compila para revisar errores. Cuando el codigo este listo, ejecutalo para ver a Karel moverse.',
  },
} satisfies Record<NonNullable<KarelTutorialFocus>, { title: string; body: string }>

const SPEED_CYCLE: KarelSpeedMultiplier[] = [1, 1.5, 2, 0.5]

const getNextSpeed = (currentSpeed: KarelSpeedMultiplier): KarelSpeedMultiplier => {
  const currentIndex = SPEED_CYCLE.indexOf(currentSpeed)
  return SPEED_CYCLE[(currentIndex + 1) % SPEED_CYCLE.length] ?? 1
}

export function KarelCodeEditor({
  metrics,
  code,
  activeLineNumber,
  compileResult,
  executionError,
  isRunning,
  isPaused,
  speedMultiplier,
  tutorialFocus,
  onChange,
  onCompile,
  onRun,
  onReset,
  onPauseToggle,
  onStepBack,
  onStepForward,
  onSpeedChange,
  onTutorialNext,
  onTutorialDismiss,
}: KarelCodeEditorProps) {
  const tutorialCopy = tutorialFocus ? TUTORIAL_COPY[tutorialFocus] : null
  const isLastTutorialStep = tutorialFocus === 'compile'
  const editorFontSize = metrics.isTablet ? 14 : 12
  const lineNumbers = code.split('\n').map((_, index) => index + 1)
  const statusIsSuccess = compileResult?.success && !executionError

  const insertCommand = (command: string) => {
    const separator = code.endsWith('\n') || code.length === 0 ? '' : '\n'
    onChange(`${code}${separator}${command}`)
  }

  return (
    <View style={[styles.panel, tutorialFocus && styles.panelTutorial]}>
      <View style={styles.toolbar}>
        <View style={styles.titleRow}>
          <Terminal color={colors.accentStrong} size={17} />
          <Text style={styles.title}>Codigo Karel Pascal</Text>
        </View>
        <ActionButton
          label="Reiniciar"
          icon={<RotateCcw color={colors.muted} size={15} />}
          onPress={onReset}
          style={styles.resetButton}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCommandRow}>
        {QUICK_COMMANDS.map((command) => (
          <Pressable key={command} onPress={() => insertCommand(command)} style={styles.quickCommandChip}>
            <Text style={styles.quickCommandText}>{command}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {compileResult && (
        <View style={[styles.compileStatus, statusIsSuccess ? styles.compileSuccess : styles.compileError]}>
          <Text style={[styles.compileStatusText, statusIsSuccess ? styles.compileSuccessText : styles.compileErrorText]}>
            {statusIsSuccess
              ? compileResult.warning
                ? `Compilacion exitosa. ${compileResult.warning}`
                : 'Compilacion exitosa. Codigo listo para ejecutar.'
              : `Error${compileResult.error ? ` en linea ${compileResult.error.line}` : ''}: ${
                  executionError ?? compileResult.error?.message ?? 'No se pudo ejecutar el programa'
                }`}
          </Text>
        </View>
      )}

      <View style={[styles.codeShell, tutorialFocus === 'code' && styles.spotlight]}>
        <View style={styles.lineNumberColumn}>
          {lineNumbers.map((lineNumber) => (
            <Text
              key={lineNumber}
              style={[styles.lineNumber, activeLineNumber === lineNumber && styles.activeLineNumber]}
            >
              {lineNumber}
            </Text>
          ))}
        </View>
        <TextInput
          value={code}
          onChangeText={onChange}
          multiline
          scrollEnabled
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          style={[styles.codeInput, { fontSize: editorFontSize, lineHeight: editorFontSize + 8 }]}
          placeholder="Escribe tu codigo Karel"
          placeholderTextColor={colors.faint}
        />
      </View>

      <View style={[styles.actions, !metrics.isLandscape && styles.actionsPortrait]}>
        <View style={styles.primaryActions}>
          <ActionButton
            label="Compilar"
            onPress={onCompile}
            disabled={isRunning}
            style={tutorialFocus === 'compile' && styles.spotlight}
          />
          <ActionButton
            label={isRunning ? 'Ejecutando' : 'Ejecutar'}
            variant="primary"
            icon={<Send color={colors.accentDark} size={16} />}
            onPress={onRun}
            disabled={isRunning}
            style={tutorialFocus === 'compile' && styles.spotlight}
          />
        </View>

        <View style={[styles.runnerControls, tutorialFocus === 'runner' && styles.spotlight]}>
          <Pressable disabled={isRunning} onPress={onStepBack} style={[styles.runnerButton, isRunning && styles.disabled]}>
            <StepBack color={colors.accentStrong} size={16} />
          </Pressable>
          <Pressable
            disabled={!isRunning && !isPaused}
            onPress={onPauseToggle}
            style={[styles.runnerButton, styles.pauseButton, !isRunning && !isPaused && styles.disabled]}
          >
            {isPaused ? <Play color={colors.accentDark} size={16} /> : <Pause color={colors.accentDark} size={16} />}
          </Pressable>
          <Pressable disabled={isRunning} onPress={onStepForward} style={[styles.runnerButton, isRunning && styles.disabled]}>
            <StepForward color={colors.accentStrong} size={16} />
          </Pressable>
          <Pressable onPress={() => onSpeedChange(getNextSpeed(speedMultiplier))} style={styles.speedButton}>
            <Text style={styles.speedText}>x{speedMultiplier}</Text>
          </Pressable>
        </View>
      </View>

      {tutorialFocus && tutorialCopy && (
        <TutorialCallout
          title={tutorialCopy.title}
          body={tutorialCopy.body}
          nextLabel={isLastTutorialStep ? 'Finalizar' : 'Siguiente'}
          onNext={onTutorialNext}
          onDismiss={onTutorialDismiss}
          style={[
            styles.editorTutorial,
            tutorialFocus === 'code' && styles.codeTutorial,
            tutorialFocus === 'runner' && styles.runnerTutorial,
            tutorialFocus === 'compile' && styles.compileTutorial,
          ]}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 8,
    backgroundColor: 'rgba(6, 12, 12, 0.88)',
    gap: 10,
  },
  panelTutorial: {
    zIndex: 30,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#a7f3d0',
    fontSize: 13,
    fontWeight: '900',
  },
  resetButton: {
    minHeight: 36,
  },
  quickCommandRow: {
    gap: 7,
    paddingRight: 8,
  },
  quickCommandChip: {
    minHeight: 32,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.24)',
    borderRadius: 6,
    backgroundColor: 'rgba(6, 78, 59, 0.28)',
    justifyContent: 'center',
  },
  quickCommandText: {
    color: '#86efac',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    fontWeight: '800',
  },
  compileStatus: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  compileSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.38)',
    backgroundColor: colors.successBg,
  },
  compileError: {
    borderColor: 'rgba(248, 113, 113, 0.42)',
    backgroundColor: colors.errorBg,
  },
  compileStatusText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  compileSuccessText: {
    color: '#bbf7d0',
  },
  compileErrorText: {
    color: colors.error,
  },
  codeShell: {
    flex: 1,
    minHeight: 170,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  lineNumberColumn: {
    width: 38,
    paddingTop: 12,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
  },
  lineNumber: {
    minHeight: 22,
    paddingRight: 8,
    color: '#64748b',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    fontWeight: '800',
  },
  activeLineNumber: {
    color: colors.accentStrong,
  },
  codeInput: {
    flex: 1,
    minHeight: '100%',
    padding: 12,
    color: '#a7f3d0',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionsPortrait: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  runnerControls: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  runnerButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderRadius: 7,
    backgroundColor: 'rgba(6, 78, 59, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong,
  },
  speedButton: {
    minWidth: 42,
    height: 38,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.68)',
    borderRadius: 7,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.55,
  },
  spotlight: {
    zIndex: 35,
    borderColor: colors.lineStrong,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  editorTutorial: {
    right: 16,
  },
  codeTutorial: {
    top: 108,
  },
  runnerTutorial: {
    bottom: 64,
    alignSelf: 'center',
  },
  compileTutorial: {
    bottom: 64,
  },
})
