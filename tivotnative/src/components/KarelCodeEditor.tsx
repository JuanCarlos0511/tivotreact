import {
  ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Code2, Lightbulb, Pause, Pencil, Plus,
  Redo2, RotateCcw, StepBack, StepForward, Terminal, Trash2, Undo2,
} from 'lucide-react-native'
import { PlayArrow } from './PlayArrow'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import type { KarelLevel } from '../shared/types'
import type { CompileResult, ExecutionLoop, KarelSpeedMultiplier } from '../features/karel/hooks/use-karel-runner'
import {
  COMMAND_TEMPLATES, describeCodeLines, getCustomCommands, getQuickCommands, getInsertionIndex,
  getSiblingIndex, moveCodeBlock, removeCodeBlock, type CommandTemplate,
} from '../features/karel/editor/code-lines'
import { configureProgramLine, insertProgramLines } from '../features/karel/editor/edit-program'
import { needsConfiguration } from '../features/karel/editor/command-config'
import { TUTORIAL_COPY, type TutorialStep } from '../features/karel/editor/tutorial'
import { CommandDialog } from './CommandDialog'
import { ActionButton, IconButton, codeFont, colors, type TabletMetrics } from './ui'

interface KarelCodeEditorProps {
  levelId: number
  quickCommands: KarelLevel['quickCommands']
  conditions: KarelLevel['conditions']
  metrics: TabletMetrics
  code: string
  activeLoops: ExecutionLoop[]
  activeLineNumber: number | null
  compileResult: CompileResult | null
  executionError: string | null
  isRunning: boolean
  isPaused: boolean
  isApplyingCode?: boolean
  speedMultiplier: KarelSpeedMultiplier
  onChange: (code: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onRun: () => void
  onReset: () => void
  onHelp: () => void
  onPauseToggle: () => void
  onStepBack: () => void
  onStepForward: () => void
  onSpeedChange: (speed: KarelSpeedMultiplier) => void
  tutorialFocus?: TutorialStep | null
  onTutorialNext?: () => void
  onTutorialDismiss?: () => void
}
const GROUPS = ['Movimiento', 'Fichas', 'Control', 'Mis instrucciones'] as const
const SPEEDS: KarelSpeedMultiplier[] = [1, 1.5, 2, 0.5]
const EMPTY_PROGRAM = 'iniciar-programa\nfinalizar-programa'
const LOOP_NEON_COLORS = ['#22c55e', '#a855f7', '#eab308'] as const
const LOOP_NEON_CORES = ['#67f59a', '#d8a4ff', '#ffe45c'] as const
const LOOP_NEON_GLOWS = ['rgba(34, 197, 94, 0.72)', 'rgba(168, 85, 247, 0.70)', 'rgba(234, 179, 8, 0.72)'] as const
const LOOP_NEON_BACKGROUNDS = ['#edfff3', '#faf4ff', '#fff9df'] as const

export function KarelCodeEditor(props: KarelCodeEditorProps) {
  const { metrics, code, onChange, isRunning, activeLineNumber, compileResult, executionError } = props
  const portrait = !metrics.isLandscape
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [replacementLine, setReplacementLine] = useState<number | null>(null)
  const [isProgramExpanded, setIsProgramExpanded] = useState(false)
  const [configuringLine, setConfiguringLine] = useState<number | null>(null)
  const [pendingCommand, setPendingCommand] = useState<CommandTemplate | null>(null)
  const [editorWidth, setEditorWidth] = useState(0)
  const programRef = useRef<ScrollView>(null)
  const commandListRef = useRef<ScrollView>(null)
  const rowLayouts = useRef(new Map<number, { y: number; height: number }>())
  const viewport = useRef({ height: 0, offset: 0 })
  const lines = code.split('\n')
  const descriptions = describeCodeLines(code)
  const allCommands = [...COMMAND_TEMPLATES, ...getCustomCommands(descriptions)]
  const commands = getQuickCommands(descriptions, props.quickCommands)
  const selected = selectedLine === null ? undefined : descriptions[selectedLine]
  const selectedId = selected?.text.split(/[\s;]/)[0]?.replace('-zumbador', '-ficha')
  const selectedCommand = allCommands.find(command => command.id === selectedId)
  const hasError = Boolean(executionError || (compileResult && !compileResult.success))
  const errorLine = executionError ? activeLineNumber : compileResult?.error?.line
  const showHelpColumn = !portrait && editorWidth >= 680
  const showQuickCommandsTutorial = props.tutorialFocus === 'quickCommands'
  const showQuickCommandArrows = portrait && props.levelId === 4
  const isExecutionMode = isRunning || props.isPaused
  const scanProgress = useRef(new Animated.Value(0)).current
  const tutorialGlow = useRef(new Animated.Value(0.58)).current
  const executionProgress = useRef(new Animated.Value(isExecutionMode ? 1 : 0)).current
  const pauseOffset = useRef(new Animated.Value(0)).current
  const editPulse = useRef(new Animated.Value(0)).current
  const programExpansion = useRef(new Animated.Value(0)).current
  const [reduceMotion, setReduceMotion] = useState(true)
  const [commandViewportWidth, setCommandViewportWidth] = useState(0)
  const [commandContentWidth, setCommandContentWidth] = useState(0)
  const [commandOffset, setCommandOffset] = useState(0)
  const canScrollCommandsBack = commandOffset > 1
  const canScrollCommandsForward = commandOffset + commandViewportWidth < commandContentWidth - 1
  const orderedCommands = GROUPS.flatMap(group => commands.filter(command => command.group === group))
  const getLoopColorIndex = (loop: ExecutionLoop) => Math.min(Math.max(0, props.activeLoops.findIndex(activeLoop =>
    activeLoop.lineNumber === loop.lineNumber && activeLoop.endLineNumber === loop.endLineNumber,
  )), LOOP_NEON_COLORS.length - 1)
  const animatedLibraryStyle: Animated.WithAnimatedValue<ViewStyle> | undefined = portrait ? {
    height: executionProgress.interpolate({ inputRange: [0, 1], outputRange: [98, 0] }),
    opacity: executionProgress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.2, 0] }),
    transform: [{ translateY: executionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
  } : undefined

  const animatedProgramToolsStyle: Animated.WithAnimatedValue<ViewStyle> = {
    height: executionProgress.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
    opacity: executionProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 0] }),
    overflow: 'hidden' as const,
  }
  const clearProgram = () => {
    if (isRunning || code === EMPTY_PROGRAM) return
    setSelectedLine(null)
    setReplacementLine(null)
    setConfiguringLine(null)
    setPendingCommand(null)
    onChange(EMPTY_PROGRAM)
  }

  const revealLine = (index: number) => {
    const row = rowLayouts.current.get(index)
    if (!row) return
    const { height, offset } = viewport.current
    if (row.y < offset) programRef.current?.scrollTo({ y: row.y, animated: true })
    else if (row.y + row.height > offset + height)
      programRef.current?.scrollTo({ y: row.y + row.height - height, animated: true })
  }
  useEffect(() => {
    const index = activeLineNumber === null ? selectedLine : activeLineNumber - 1
    if (index !== null) revealLine(index)
  }, [activeLineNumber, selectedLine, code, portrait])
  useEffect(() => {
    if (selectedLine !== null && selectedLine >= lines.length) setSelectedLine(null)
    if (replacementLine !== null && (replacementLine >= lines.length || isRunning)) setReplacementLine(null)
  }, [lines.length, selectedLine, replacementLine, isRunning])
  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value) })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => { mounted = false; subscription.remove() }
  }, [])
  useEffect(() => {
    if (reduceMotion) {
      executionProgress.setValue(isExecutionMode ? 1 : 0)
      return
    }
    const animation = Animated.timing(executionProgress, {
      toValue: isExecutionMode ? 1 : 0,
      duration: 280,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [executionProgress, isExecutionMode, reduceMotion])
  useEffect(() => {
    if (!isRunning || props.isPaused || reduceMotion) {
      pauseOffset.setValue(0)
      return
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pauseOffset, { toValue: -1, duration: 190, useNativeDriver: true }),
      Animated.timing(pauseOffset, { toValue: 1, duration: 190, useNativeDriver: true }),
      Animated.timing(pauseOffset, { toValue: -1, duration: 190, useNativeDriver: true }),
      Animated.timing(pauseOffset, { toValue: 0, duration: 190, useNativeDriver: true }),
      Animated.delay(440),
    ]))
    animation.start()
    return () => { animation.stop(); pauseOffset.setValue(0) }
  }, [isRunning, pauseOffset, props.isPaused, reduceMotion])
  useEffect(() => {
    if (!props.isApplyingCode) {
      scanProgress.setValue(0)
      return
    }
    const animation = Animated.loop(Animated.timing(scanProgress, {
      toValue: 1,
      duration: 720,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }))
    animation.start()
    return () => animation.stop()
  }, [props.isApplyingCode, scanProgress])
  useEffect(() => {
    if (!showQuickCommandsTutorial) {
      tutorialGlow.setValue(0.58)
      return
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(tutorialGlow, { toValue: 1, duration: 525, useNativeDriver: true }),
      Animated.timing(tutorialGlow, { toValue: 0.58, duration: 525, useNativeDriver: true }),
    ]))
    animation.start()
    return () => animation.stop()
  }, [showQuickCommandsTutorial, tutorialGlow])
  useEffect(() => {
    if (replacementLine === null) {
      editPulse.setValue(0)
      return
    }
    if (reduceMotion) {
      editPulse.setValue(1)
      return
    }
    const animation = Animated.sequence([
      Animated.timing(editPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(editPulse, { toValue: 0.35, duration: 400, useNativeDriver: true }),
    ])
    animation.start()
    return () => { animation.stop(); editPulse.setValue(0) }
  }, [editPulse, reduceMotion, replacementLine])
  useEffect(() => {
    const animation = Animated.timing(programExpansion, {
      toValue: isProgramExpanded ? 1 : 0,
      duration: reduceMotion ? 0 : 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [isProgramExpanded, programExpansion, reduceMotion])

  const programPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => isProgramExpanded ? gesture.dy > 14 : gesture.dy < -14,
    onPanResponderRelease: (_event, gesture) => {
      if (isProgramExpanded && gesture.dy > 20) setIsProgramExpanded(false)
      else if (!isProgramExpanded && gesture.dy < -20) setIsProgramExpanded(true)
    },
  }), [isProgramExpanded])

  const scrollQuickCommands = (direction: -1 | 1) => {
    const nextOffset = Math.max(
      0,
      Math.min(commandContentWidth - commandViewportWidth, commandOffset + direction * Math.max(140, commandViewportWidth * 0.65)),
    )
    commandListRef.current?.scrollTo({ x: nextOffset, animated: true })
  }

  const select = (index: number) => {
    if (replacementLine !== null && replacementLine !== index) setReplacementLine(null)
    setSelectedLine(index)
  }
  const commit = (result: { code: string; selected: number }) => {
    if (isRunning) return
    setReplacementLine(null)
    onChange(result.code)
    setSelectedLine(result.selected)
  }
  const insert = (source: string[], definition = false) => {
    commit(insertProgramLines(code, source, selectedLine, {
      index: definition ? 1 : getInsertionIndex(descriptions, selectedLine),
      replaceSelection: false,
    }))
  }
  const replaceSelection = (source: string[]) => {
    if (replacementLine === null) return
    commit(insertProgramLines(code, source, replacementLine, {
      index: replacementLine,
      replaceSelection: true,
    }))
  }
  const addLine = () => {
    const result = insertProgramLines(code, [''], selectedLine, {
      index: getInsertionIndex(descriptions, selectedLine), replaceSelection: false,
    })
    commit(result)
  }
  const moveLine = (direction: -1 | 1) => {
    if (selectedLine !== null) commit(moveCodeBlock(code, selectedLine, direction))
  }
  const removeLine = () => {
    if (selectedLine === null || isRunning) return
    const nextCode = removeCodeBlock(code, selectedLine)
    commit({ code: nextCode, selected: Math.min(selectedLine, nextCode.split('\n').length - 1) })
  }
  const reset = () => {
    setSelectedLine(null)
    setReplacementLine(null)
    props.onReset()
    programRef.current?.scrollTo({ y: 0 })
  }
  const startCommand = (command: CommandTemplate) => {
    if (isRunning) return
    setConfiguringLine(null)
    if (needsConfiguration(command)) setPendingCommand(command)
    else if (replacementLine !== null) replaceSelection(command.source)
    else insert(command.source)
  }

  const beginReplacement = () => {
    if (isRunning || selectedLine === null || !selected || selected.fixed) return
    setConfiguringLine(null)
    setPendingCommand(null)
    setReplacementLine(current => current === selectedLine ? null : selectedLine)
    commandListRef.current?.scrollTo({ x: 0, animated: true })
  }

  const commandCard = (command: CommandTemplate) => (
    <Pressable key={command.id} accessibilityRole="button"
      accessibilityLabel={replacementLine === null
        ? 'Añadir ' + command.label.toLowerCase()
        : `Cambiar la línea ${replacementLine + 1} a ${command.label.toLowerCase()}`}
      accessibilityHint={command.description}
      disabled={isRunning} onPress={() => startCommand(command)}
      style={({ pressed }) => [styles.command, portrait && styles.commandPortrait, isRunning && styles.disabled, pressed && styles.pressed]}>
      <View style={styles.commandCopy}>
        <Text style={styles.commandTitle}>{command.label}</Text>
        {!portrait && <Text style={styles.commandSyntax}>{command.source[0]}</Text>}
      </View>
      {replacementLine === null
        ? <Plus size={13} color={colors.accentStrong} />
        : <Pencil size={13} color={colors.accentStrong} />}
    </Pressable>
  )

  const pauseControlColor = props.isPaused ? '#ffffff' : '#08734f'
  const controls = (
    <View testID="execution-controls" style={[styles.controls, portrait && styles.controlsPortrait]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Reiniciar" onPress={reset}
        style={({ pressed }) => [styles.resetButton, portrait && styles.resetButtonPortrait, pressed && styles.controlPressed]}>
        <RotateCcw size={14} color={colors.text} />
        <Text style={styles.resetLabel}>Reiniciar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={isRunning ? 'Ejecutando' : 'Ejecutar'}
        accessibilityState={{ disabled: isRunning }} disabled={isRunning} onPress={props.onRun}
        style={({ pressed }) => [styles.executeButton, portrait && styles.executeButtonPortrait,
          pressed && !isRunning && styles.controlPressed, isRunning && styles.controlDisabled]}>
        <PlayArrow size={14} color="#ffffff" />
        <Text style={styles.executeLabel}>{isRunning ? 'Ejecutando' : 'Ejecutar'}</Text>
      </Pressable>
      <IconButton label="Retroceder un paso" onPress={props.onStepBack} disabled={isRunning} style={[styles.stepButton, portrait && styles.stepButtonPortrait]}>
        <StepBack size={15} color="#008c67" />
      </IconButton>
      <Animated.View style={{ transform: [{ translateX: pauseOffset }] }}>
        <IconButton label={props.isPaused ? 'Reanudar ejecución' : 'Pausar ejecución'}
          onPress={props.onPauseToggle} disabled={!isRunning && !props.isPaused}
          style={[styles.stepButton, portrait && styles.stepButtonPortrait, isRunning && !props.isPaused && styles.pauseReady, props.isPaused && styles.pausePaused]}>
          {props.isPaused ? <PlayArrow size={15} color={pauseControlColor} /> : <Pause size={15} color={pauseControlColor} />}
        </IconButton>
      </Animated.View>
      <IconButton label="Avanzar un paso" onPress={props.onStepForward} disabled={isRunning} style={[styles.stepButton, portrait && styles.stepButtonPortrait]}>
        <StepForward size={15} color="#008c67" />
      </IconButton>
      <Pressable accessibilityRole="button" accessibilityLabel={'Velocidad x' + props.speedMultiplier}
        onPress={() => props.onSpeedChange(SPEEDS[(SPEEDS.indexOf(props.speedMultiplier) + 1) % SPEEDS.length]!)}
        style={({ pressed }) => [styles.speed, portrait && styles.speedPortrait, pressed && styles.controlPressed]}>
        {!portrait && <Text style={styles.speedLabel}>VELOCIDAD</Text>}
        <Text style={styles.speedValue}>×{props.speedMultiplier}</Text>
      </Pressable>
    </View>
  )
  return (
    <View testID="code-editor" onLayout={event => setEditorWidth(event.nativeEvent.layout.width)}
      pointerEvents={props.isApplyingCode ? 'none' : 'auto'}
      accessibilityState={{ busy: Boolean(props.isApplyingCode) }}
      style={[styles.panel, portrait && styles.panelPortrait]}>
      {!portrait && (
        <View style={styles.toolbar}>
          <View style={styles.heading}><Terminal size={17} color={colors.accentStrong} /><Text style={styles.title}>Código Karel Pascal</Text></View>
          <View style={styles.toolbarActions}>
            <IconButton label="Objetivos y tutorial" onPress={props.onHelp}><Lightbulb size={17} color={colors.accentStrong} /></IconButton>
          </View>
        </View>
      )}
      {portrait && (
        <Animated.View pointerEvents={isProgramExpanded ? 'none' : 'auto'} style={{
          height: programExpansion.interpolate({ inputRange: [0, 1], outputRange: [59, 0] }),
          opacity: programExpansion.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.2, 0] }),
          overflow: 'hidden',
        }}>{controls}</Animated.View>
      )}
      <View style={[styles.columns, portrait && styles.columnsPortrait]} onTouchEnd={() => {
        if (isProgramExpanded) setIsProgramExpanded(false)
      }}>
        <Animated.View testID="quick-commands" pointerEvents={isProgramExpanded || (portrait && isExecutionMode) ? 'none' : 'auto'}
          style={[styles.library, portrait && styles.libraryPortrait, animatedLibraryStyle, portrait && {
            maxHeight: programExpansion.interpolate({ inputRange: [0, 1], outputRange: [98, 0] }),
            overflow: 'hidden',
          }, !portrait && {
            maxWidth: programExpansion.interpolate({ inputRange: [0, 1], outputRange: [158, 0] }),
            paddingHorizontal: programExpansion.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
            overflow: 'hidden',
          }]}>
          {replacementLine !== null && (
            <Animated.View pointerEvents="none" style={[styles.editTargetOverlay, { opacity: editPulse }]} />
          )}
          <View style={[styles.heading, styles.quickHeading]}>
            <Plus size={16} color={colors.accentStrong} /><Text style={[styles.headingText, portrait && styles.quickHeadingText]}>Comandos rápidos</Text>
            {showQuickCommandArrows && (
              <View accessibilityLabel="Navegar comandos rápidos" style={styles.carouselActions}>
                <Animated.View style={[styles.carouselGlow, showQuickCommandsTutorial && { opacity: tutorialGlow }]}>
                  <IconButton label="Ver comandos anteriores" disabled={!canScrollCommandsBack}
                    onPress={() => scrollQuickCommands(-1)} style={styles.carouselButton}>
                    <ChevronLeft size={16} color={colors.accentStrong} />
                  </IconButton>
                </Animated.View>
                <Animated.View style={[styles.carouselGlow, showQuickCommandsTutorial && { opacity: tutorialGlow }]}>
                  <IconButton label="Ver más comandos" disabled={!canScrollCommandsForward}
                    onPress={() => scrollQuickCommands(1)} style={styles.carouselButton}>
                    <ChevronRight size={16} color={colors.accentStrong} />
                  </IconButton>
                </Animated.View>
              </View>
            )}
          </View>
          {!portrait && <Text style={styles.caption}>
            {replacementLine === null
              ? 'Pulsa para añadir al programa.'
              : `Elige el comando nuevo para la línea ${replacementLine + 1}.`}
          </Text>}
          <ScrollView ref={commandListRef} key={portrait ? 'horizontal-commands' : 'vertical-commands'} horizontal={portrait}
            style={styles.commandList} contentContainerStyle={portrait ? styles.commandStrip : styles.commandGroups}
            keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
            onLayout={event => setCommandViewportWidth(event.nativeEvent.layout.width)}
            onContentSizeChange={width => setCommandContentWidth(width)}
            onScroll={event => setCommandOffset(event.nativeEvent.contentOffset.x)}>
            {portrait ? orderedCommands.map(commandCard) : GROUPS.filter(group => commands.some(command => command.group === group)).map(group => (
              <View key={group} style={styles.category}>
                <Text style={styles.categoryTitle}>{group.toUpperCase()}</Text>
                {commands.filter(command => command.group === group).map(commandCard)}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
        <View onTouchEnd={event => event.stopPropagation()}
          style={[styles.program, portrait && styles.programPortrait, isProgramExpanded && styles.programExpanded]}>
          {props.isApplyingCode && (
            <View testID="code-application-overlay" accessibilityLiveRegion="polite" style={styles.applicationOverlay}>
              <Animated.View
                style={[
                  styles.scanner,
                  { transform: [{ translateY: scanProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 230] }) }] },
                ]}
              />
              <View style={styles.applicationCard}>
                <Text style={styles.applicationTitle}>Cargando la sugerencia…</Text>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
              </View>
            </View>
          )}
          <Animated.View style={animatedProgramToolsStyle} pointerEvents={isExecutionMode ? 'none' : 'auto'}>
            <View accessibilityLabel={isProgramExpanded ? 'Arrastra hacia abajo para contraer el programa' : 'Arrastra hacia arriba para ampliar el programa'}
              style={[styles.heading, styles.programHeading]} {...programPanResponder.panHandlers}>
              <Code2 size={16} color={colors.accentStrong} /><Text style={styles.headingText}>Programa</Text>
              {isProgramExpanded && (
                <IconButton label="Contraer programa" onPress={() => setIsProgramExpanded(false)} style={styles.programCollapseButton}>
                  <ChevronDown size={16} color="#ffffff" />
                </IconButton>
              )}
              <View style={styles.lineTools}>
              <IconButton label="Deshacer cambio en el código" disabled={isRunning || !props.canUndo}
                onPress={() => { setReplacementLine(null); props.onUndo() }} style={styles.lineTool}>
                <Undo2 size={15} color={colors.blue} />
              </IconButton>
              <IconButton label="Rehacer cambio en el código" disabled={isRunning || !props.canRedo}
                onPress={() => { setReplacementLine(null); props.onRedo() }} style={styles.lineTool}>
                <Redo2 size={15} color={colors.blue} />
              </IconButton>
              <IconButton label="Subir línea seleccionada" disabled={isRunning || selectedLine === null || getSiblingIndex(descriptions, selectedLine, -1) === null} onPress={() => moveLine(-1)} style={styles.lineTool}>
                <ArrowUp size={15} color={colors.accentStrong} />
              </IconButton>
              <IconButton label="Bajar línea seleccionada" disabled={isRunning || selectedLine === null || getSiblingIndex(descriptions, selectedLine, 1) === null} onPress={() => moveLine(1)} style={styles.lineTool}>
                <ArrowDown size={15} color={colors.accentStrong} />
              </IconButton>
              <IconButton label="Eliminar línea seleccionada" disabled={isRunning || !selected || selected.fixed} onPress={removeLine} style={styles.lineTool}>
                <Trash2 size={15} color={colors.error} />
              </IconButton>
              <IconButton
                label={replacementLine !== null ? 'Cancelar edición de la línea seleccionada' : 'Editar línea seleccionada con comandos rápidos'}
                disabled={isRunning || !selected || selected.fixed}
                onPress={beginReplacement}
                style={[styles.lineTool, replacementLine !== null && styles.lineToolEditing]}>
                <Pencil size={15} color={colors.accentStrong} />
              </IconButton>
              <IconButton label="Borrar todo el código" disabled={isRunning || code === EMPTY_PROGRAM}
                onPress={clearProgram} style={[styles.lineTool, styles.lineToolWide]}>
                <Trash2 size={13} color={colors.error} /><Text style={styles.clearAllText}>Borrar todo</Text>
              </IconButton>
              </View>
            </View>
          </Animated.View>
          <ScrollView ref={programRef} testID="program-lines" style={styles.lineList} contentContainerStyle={styles.lineContent}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" scrollEventThrottle={16}
            onLayout={event => {
              viewport.current.height = event.nativeEvent.layout.height
              const index = activeLineNumber === null ? selectedLine : activeLineNumber - 1
              if (index !== null) revealLine(index)
            }}
            onScroll={event => { viewport.current.offset = event.nativeEvent.contentOffset.y }}>
            {descriptions.map((line, index) => {
              const active = activeLineNumber === index + 1
              const activeLoopDepth = props.activeLoops.filter(loop => index + 1 >= loop.lineNumber && index + 1 <= loop.endLineNumber).length
              const inLoop = activeLoopDepth > 0
              const lineLoops = props.activeLoops.filter(loop => loop.lineNumber === index + 1)
              const activeLoopBoundaries = props.activeLoops.slice(0, LOOP_NEON_COLORS.length).map((loop, colorIndex) => ({
                loop,
                colorIndex,
                isStart: loop.lineNumber === index + 1,
                isEnd: loop.endLineNumber === index + 1,
              })).filter(boundary => boundary.isStart || boundary.isEnd)
              const invalid = hasError && errorLine === index + 1
              const nestingStyle = line.fixed ? undefined
                : line.depth >= 4 ? styles.nestingDepth4
                : line.depth === 3 ? styles.nestingDepth3
                : line.depth === 2 ? styles.nestingDepth2
                : styles.nestingDepth1
              return (
                <View key={index} style={styles.lineShell} onLayout={event => {
                  rowLayouts.current.set(index, event.nativeEvent.layout)
                  if ((activeLineNumber === null && selectedLine === index) || active) revealLine(index)
                }}>
                  {activeLoopBoundaries.length > 0 && (
                    <View pointerEvents="none" style={styles.loopNeonBoundaries}>
                      {activeLoopBoundaries.map(({ loop, colorIndex, isStart, isEnd }) => {
                        const neonColor = LOOP_NEON_COLORS[colorIndex]!
                        const neonCore = LOOP_NEON_CORES[colorIndex]!
                        const neonGlow = LOOP_NEON_GLOWS[colorIndex]!
                        // Leave room for the blurred endpoints so the glow fades naturally
                        // instead of being cut by the rounded corners of the code row.
                        const inset = 14 + colorIndex * 10
                        const neonStyle = {
                          backgroundColor: neonCore,
                          boxShadow: `0 0 3px 1px ${neonColor}, 0 0 11px 4px ${neonGlow}`,
                        } as const
                        return (
                          <View key={loop.lineNumber + '-' + loop.endLineNumber} style={StyleSheet.absoluteFill}>
                            {isStart && <View style={[styles.loopNeonStroke, styles.loopNeonStrokeTop, { left: inset, right: inset }, neonStyle]} />}
                            {isEnd && <View style={[styles.loopNeonStroke, styles.loopNeonStrokeBottom, { left: inset, right: inset }, neonStyle]} />}
                          </View>
                        )
                      })}
                    </View>
                  )}
                  <Pressable testID={'code-line-' + (index + 1)} accessibilityRole="button"
                    accessibilityLabel={'Seleccionar línea ' + (index + 1) + ': ' + line.text}
                    accessibilityState={{ selected: selectedLine === index }}
                    onPress={() => select(index)}
                    style={[styles.line, nestingStyle, line.fixed && !portrait && styles.fixedLine,
                      inLoop && styles.loopLine, activeLoopDepth === 2 && styles.loopLineDepth2, activeLoopDepth >= 3 && styles.loopLineDepth3,
                      selectedLine === index && styles.selectedLine,
                      active && styles.activeLine, active && activeLoopDepth === 1 && styles.loopLineDepth1Active,
                      active && activeLoopDepth === 2 && styles.loopLineDepth2Active,
                      active && activeLoopDepth >= 3 && styles.loopLineDepth3Active, invalid && styles.invalidLine]}>
                  <View style={styles.lineNumber}>
                    <Text style={[styles.lineNumberText, active && styles.activeNumber]}>{index + 1}</Text>
                    {active && <PlayArrow size={8} color={colors.accentStrong} />}
                  </View>
                  <Text style={[styles.lineText, { paddingLeft: 4 + line.depth * 14 }, line.fixed && styles.fixedText]}>
                    {lines[index]?.trimStart() || 'Línea vacía'}
                  </Text>
                  {lineLoops.length > 0 && (
                    <View style={styles.lineLoopBadges}>
                      {lineLoops.map((loop, loopIndex) => {
                        const colorIndex = getLoopColorIndex(loop)
                        return (
                          <Text key={`${loop.lineNumber}-${loopIndex}`}
                            accessibilityLabel={`Iteración ${loop.iteration} de ${loop.total ?? 'sin límite'}`}
                            style={[styles.lineLoopBadge, {
                              borderColor: LOOP_NEON_COLORS[colorIndex]!,
                              color: LOOP_NEON_COLORS[colorIndex]!,
                              backgroundColor: LOOP_NEON_BACKGROUNDS[colorIndex]!,
                            }]}>
                            {loop.iteration}/{loop.total ?? '∞'}
                          </Text>
                        )
                      })}
                    </View>
                  )}
                  </Pressable>
                </View>
              )
            })}
          </ScrollView>
          <Animated.View style={animatedProgramToolsStyle} pointerEvents={isExecutionMode ? 'none' : 'auto'}>
            <ActionButton label="Añadir línea" icon={<Plus size={14} color={colors.accentStrong} />}
              disabled={isRunning} onPress={addLine} style={styles.addLine} />
          </Animated.View>
        </View>
        {showHelpColumn && (
          <ScrollView style={styles.help} contentContainerStyle={styles.helpContent}>
            <View style={styles.heading}><BookOpen size={16} color={colors.accentStrong} /><Text style={styles.headingText}>Ayuda</Text></View>
            <Text style={styles.helpKicker}>{selected ? 'Línea ' + ((selectedLine ?? 0) + 1) : 'Paso a paso'}</Text>
            <Text style={styles.helpTitle}>{selectedCommand?.label ?? (selected?.fixed ? 'Estructura del programa' : 'Cada línea, una instrucción')}</Text>
            <Text style={styles.helpBody}>{selectedCommand?.description ?? (selected?.fixed
              ? 'Estas líneas delimitan el programa y sus bloques. Al añadir, mover o eliminar un bloque, su cierre lo acompaña.'
              : 'Elige un comando para añadirlo. Selecciona y edita una línea para adaptar el programa a tu objetivo.')}</Text>
            {selectedCommand && <Text selectable style={styles.helpCode}>{selectedCommand.source.join('\n')}</Text>}
          </ScrollView>
        )}
      </View>
      {showQuickCommandsTutorial && (
        <View testID="quick-commands-tutorial" style={[styles.tutorialCard, portrait && styles.tutorialCardPortrait]}>
          <Text style={styles.tutorialTitle}>{TUTORIAL_COPY.quickCommands.title}</Text>
          <Text style={styles.tutorialBody}>{TUTORIAL_COPY.quickCommands.body}</Text>
          <View style={styles.tutorialActions}>
            <ActionButton label="Omitir" onPress={props.onTutorialDismiss ?? props.onHelp} style={styles.tutorialButton} />
            <ActionButton label="Finalizar" variant="primary" onPress={props.onTutorialNext ?? props.onHelp} style={styles.tutorialButton} />
          </View>
        </View>
      )}
      {hasError && (
        <View accessibilityLiveRegion="polite" style={[styles.status, hasError && styles.statusError]}>
          <Text accessibilityRole={hasError ? 'alert' : 'text'} style={[styles.statusText, hasError && styles.errorText]}>
            {hasError ? 'Error' + (errorLine ? ' en línea ' + errorLine : '') + ': ' + (executionError ?? compileResult?.error?.message)
              : isRunning ? 'Programa en ejecución.' : props.isPaused ? 'Programa en pausa.' : 'Código válido.'}
          </Text>
        </View>
      )}
      {!portrait && (
        <Animated.View pointerEvents={isProgramExpanded ? 'none' : 'auto'} style={{
          maxHeight: programExpansion.interpolate({ inputRange: [0, 1], outputRange: [54, 0] }),
          opacity: programExpansion.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.2, 0] }),
          overflow: 'hidden',
        }}>{controls}</Animated.View>
      )}
      {pendingCommand && <CommandDialog command={pendingCommand} code={code} conditions={props.conditions}
        initialLine={configuringLine === null ? undefined : descriptions[configuringLine]?.text}
        confirmLabel={replacementLine !== null ? 'Cambiar' : undefined}
        onClose={() => { setPendingCommand(null); setConfiguringLine(null); setReplacementLine(null) }}
        onInsert={source => {
          if (configuringLine !== null) commit({ code: configureProgramLine(code, configuringLine, source[0]!), selected: configuringLine })
          else if (replacementLine !== null) replaceSelection(source)
          else insert(source, pendingCommand.id === 'define-nueva-instruccion')
          setPendingCommand(null)
          setConfiguringLine(null)
        }} />}
    </View>
  )
}
const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 0, minWidth: 0, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel },
  panelPortrait: { borderWidth: 0, borderRadius: 0, padding: 0, gap: 0, backgroundColor: colors.mobileShell },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  title: { fontSize: 14, color: colors.text, fontWeight: '800' },
  pill: { borderRadius: 22 },
  headingText: { fontSize: 13, fontWeight: '800', color: colors.text, flexShrink: 1 },
  columns: { flex: 1, minHeight: 0, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panelRaised, overflow: 'hidden' },
  columnsPortrait: { borderWidth: 0, borderRadius: 0, flexDirection: 'column', backgroundColor: 'transparent' },
  library: { position: 'relative', width: 158, padding: 10, borderRightWidth: 1, borderColor: colors.line, gap: 8 },
  libraryPortrait: { width: '100%', height: 98, padding: 8, paddingBottom: 6, borderRightWidth: 0 },
  quickHeading: { flexShrink: 0 },
  quickHeadingText: { color: colors.muted, letterSpacing: 0.7, textTransform: 'uppercase' },
  carouselActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 },
  carouselGlow: { borderRadius: 7, shadowColor: '#10b981', shadowOpacity: 0.95, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  carouselButton: { width: 30, height: 30, borderColor: '#34d399', backgroundColor: colors.panelRaised },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  commandList: { flex: 1, minHeight: 0 },
  commandStrip: { gap: 8, paddingBottom: 4, paddingHorizontal: 2 },
  commandGroups: { paddingBottom: 6, gap: 16 },
  category: { gap: 6 },
  categoryTitle: { color: colors.muted, fontSize: 10, fontWeight: '800', marginBottom: 1 },
  command: { minHeight: 56, padding: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.panelRaised, flexDirection: 'row', alignItems: 'center', gap: 5 },
  commandPortrait: { width: 106, height: 56, borderRadius: 10, borderColor: colors.mobileLine, paddingVertical: 7, shadowColor: '#172b26', shadowOpacity: 0.07, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  commandCopy: { flex: 1, minWidth: 0, gap: 4 },
  commandTitle: { fontSize: 11, fontWeight: '800', color: colors.text },
  commandSyntax: { fontFamily: codeFont, fontSize: 9, lineHeight: 13, color: colors.muted },
  editTargetOverlay: { position: 'absolute', zIndex: 5, top: 3, right: 3, bottom: 3, left: 3, borderWidth: 2, borderColor: '#10b981', borderRadius: 10, shadowColor: '#10b981', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  program: { position: 'relative', flex: 1, minWidth: 0, minHeight: 0, padding: 10, gap: 6, overflow: 'hidden' },
  programPortrait: { marginHorizontal: 8, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: colors.mobileLine, borderRadius: 14, backgroundColor: colors.panelRaised, shadowColor: '#172b26', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  programExpanded: { position: 'relative', flex: 1, marginTop: 6, shadowOpacity: 0, elevation: 0 },
  programHeading: { minHeight: 34 },
  programCollapseButton: { width: 30, height: 30, marginLeft: 5, borderRadius: 7, borderColor: '#065f46', backgroundColor: '#08734f' },
  lineTools: { flexDirection: 'row', gap: 3, alignItems: 'center', marginLeft: 'auto' },
  lineTool: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#f4f8f5' },
  lineToolWide: { width: 78, flexDirection: 'row', gap: 3 },
  clearAllText: { color: colors.error, fontSize: 9, fontWeight: '900' },
  lineToolEditing: { borderColor: colors.accentStrong, backgroundColor: colors.successBg, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  lineList: { flex: 1, minHeight: 0 },
  lineContent: { gap: 5, padding: 2 },
  lineShell: { position: 'relative', overflow: 'visible' },
  line: { zIndex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.panelRaised },
  loopLine: { backgroundColor: '#d9f6e7' },
  loopLineDepth2: { backgroundColor: '#f0e6ff' },
  loopLineDepth3: { backgroundColor: '#fff3c4' },
  loopLineDepth1Active: { backgroundColor: '#c5efd9' },
  loopLineDepth2Active: { backgroundColor: '#dfc8fb' },
  loopLineDepth3Active: { backgroundColor: '#ffeba0' },
  nestingDepth1: { backgroundColor: '#eaf8ef' },
  nestingDepth2: { backgroundColor: '#e3f7f4' },
  nestingDepth3: { backgroundColor: '#e8f3fa' },
  nestingDepth4: { backgroundColor: '#fff5cf' },
  loopNeonBoundaries: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0, overflow: 'visible' },
  loopNeonStroke: { position: 'absolute', height: 2, borderRadius: 1 },
  loopNeonStrokeTop: { top: -1 },
  loopNeonStrokeBottom: { bottom: -1 },
  fixedLine: { borderColor: 'transparent', backgroundColor: 'transparent' },
  selectedLine: { borderColor: colors.blue },
  activeLine: { borderColor: colors.accentStrong, backgroundColor: colors.successBg },
  invalidLine: { borderColor: colors.error, backgroundColor: colors.errorBg },
  lineNumber: { width: 26, alignItems: 'center', justifyContent: 'center', gap: 2 },
  lineNumberText: { fontSize: 10, color: colors.muted, fontFamily: codeFont },
  activeNumber: { color: colors.accentStrong },
  lineText: { flex: 1, minWidth: 0, paddingVertical: 8, paddingRight: 4, fontSize: 11, lineHeight: 17, fontFamily: codeFont, color: colors.text },
  fixedText: { color: colors.muted },
  addLine: { minHeight: 38, borderStyle: 'dashed', marginTop: 2, paddingVertical: 6 },
  applicationOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,252,247,0.92)' },
  scanner: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#34d399', shadowColor: '#10b981', shadowOpacity: 0.85, shadowRadius: 10, elevation: 8 },
  applicationCard: { width: '72%', maxWidth: 270, padding: 16, gap: 9, borderWidth: 1, borderColor: '#34d399', borderRadius: 10, backgroundColor: colors.panelRaised, shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  applicationTitle: { color: colors.accentStrong, fontSize: 12, fontWeight: '900' },
  skeletonLine: { width: '92%', height: 7, borderRadius: 4, backgroundColor: '#82d8b6' },
  skeletonLineShort: { width: '72%', opacity: 0.72 },
  skeletonLineMedium: { width: '84%', opacity: 0.82 },
  help: { width: 158, flexGrow: 0, flexShrink: 0, borderLeftWidth: 1, borderColor: colors.line },
  helpContent: { padding: 12, gap: 10 },
  helpKicker: { marginTop: 16, fontSize: 10, fontWeight: '800', color: colors.accentStrong },
  helpTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: colors.text },
  helpBody: { fontSize: 12, lineHeight: 20, color: colors.muted },
  helpCode: { fontFamily: codeFont, fontSize: 10, lineHeight: 17, color: colors.accentStrong, backgroundColor: colors.panelSoft, padding: 8, borderRadius: 7 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
  controlsPortrait: { padding: 8, gap: 5, borderTopWidth: 1, borderColor: colors.mobileLine, backgroundColor: '#f7f8f6', shadowColor: '#172b26', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -3 }, elevation: 3 },
  resetButton: { flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 38, paddingHorizontal: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  resetButtonPortrait: { flexGrow: 1.15, flexShrink: 1, flexBasis: 0, width: 0, minHeight: 42, borderRadius: 12, borderColor: colors.mobileLine, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  resetLabel: { color: colors.text, fontSize: 12, fontWeight: '900' },
  executeButton: { flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 38, paddingHorizontal: 8, borderWidth: 1, borderColor: '#065f46', borderRadius: 8, backgroundColor: '#08734f', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#065f46', shadowOpacity: 0.28, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  executeButtonPortrait: { flexGrow: 1.3, flexShrink: 1, flexBasis: 0, width: 0, minHeight: 42, borderRadius: 12 },
  executeLabel: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  stepButton: { width: 36, height: 38, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
  stepButtonPortrait: { width: 32, height: 42, borderRadius: 10, borderColor: '#b8dfcf', backgroundColor: '#effbf5' },
  pauseReady: { borderColor: '#67e8f9', backgroundColor: '#e6fffb', shadowColor: '#22d3ee', shadowOpacity: 0.9, shadowRadius: 7, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  pausePaused: { borderColor: '#6ee7b7', backgroundColor: '#065f46', shadowColor: '#34d399', shadowOpacity: 0.68, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  speed: { minWidth: 58, height: 38, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', gap: 1 },
  speedPortrait: { minWidth: 58, width: 58, height: 42, paddingHorizontal: 3, borderWidth: 1, borderColor: '#253b35', borderRadius: 10, backgroundColor: '#253b35' },
  speedLabel: { color: '#cbd5e1', fontSize: 7, fontWeight: '800' },
  speedValue: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  lineLoopBadges: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingRight: 4 },
  lineLoopBadge: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#6ec9a5', borderRadius: 5, color: colors.accentStrong, backgroundColor: colors.successBg, fontFamily: codeFont, fontSize: 10, fontWeight: '800' },
  status: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 7, backgroundColor: colors.successBg },
  statusError: { backgroundColor: colors.errorBg },
  statusText: { fontSize: 12, lineHeight: 17, color: colors.accentStrong },
  errorText: { color: colors.error },
  tutorialCard: { gap: 8, padding: 12, borderWidth: 1, borderColor: '#8bd7bb', borderRadius: 8, backgroundColor: '#effbf5' },
  tutorialCardPortrait: { marginHorizontal: 8, marginTop: 8 },
  tutorialTitle: { color: colors.accentStrong, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  tutorialBody: { color: colors.text, fontSize: 13, lineHeight: 19 },
  tutorialActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  tutorialButton: { minHeight: 36 },
  disabled: { opacity: 0.45 },
  pressed: { backgroundColor: colors.successBg },
  controlDisabled: { opacity: 0.45 },
  controlPressed: { opacity: 0.78 },
})
