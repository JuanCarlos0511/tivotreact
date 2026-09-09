import {
  ArrowDown, ArrowUp, BookOpen, Code2, Lightbulb, Pause, Pencil, Play, Plus,
  Redo2, RotateCcw, StepBack, StepForward, Terminal, Trash2, Undo2,
} from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { KarelLevel } from '../shared/types'
import type { CompileResult, ExecutionLoop, KarelSpeedMultiplier } from '../features/karel/hooks/use-karel-runner'
import {
  COMMAND_TEMPLATES, describeCodeLines, getCustomCommands, getQuickCommands, getInsertionIndex,
  getSiblingIndex, moveCodeBlock, removeCodeBlock, type CommandTemplate,
} from '../features/karel/editor/code-lines'
import { configureProgramLine, insertProgramLines, updateProgramLine } from '../features/karel/editor/edit-program'
import { needsConfiguration } from '../features/karel/editor/command-config'
import { TUTORIAL_COPY, type TutorialStep } from '../features/karel/editor/tutorial'
import { CommandDialog } from './CommandDialog'
import { ActionButton, IconButton, codeFont, colors, type TabletMetrics } from './ui'

interface KarelCodeEditorProps {
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

export function KarelCodeEditor(props: KarelCodeEditorProps) {
  const { metrics, code, onChange, isRunning, activeLineNumber, compileResult, executionError } = props
  const portrait = !metrics.isLandscape
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [editingLine, setEditingLine] = useState<number | null>(null)
  const [configuringLine, setConfiguringLine] = useState<number | null>(null)
  const [pendingCommand, setPendingCommand] = useState<CommandTemplate | null>(null)
  const [editorWidth, setEditorWidth] = useState(0)
  const programRef = useRef<ScrollView>(null)
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
    if (editingLine !== null && (editingLine >= lines.length || isRunning)) setEditingLine(null)
  }, [lines.length, selectedLine, editingLine, isRunning])

  const select = (index: number) => {
    setSelectedLine(index)
    if (editingLine !== index) {
      setEditingLine(null)
      Keyboard.dismiss()
    }
  }
  const commit = (result: { code: string; selected: number }) => {
    if (isRunning) return
    setEditingLine(null)
    Keyboard.dismiss()
    onChange(result.code)
    setSelectedLine(result.selected)
  }
  const insert = (source: string[], definition = false) => {
    commit(insertProgramLines(code, source, selectedLine, definition
      ? { index: 1, replaceSelection: false } : undefined))
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
    Keyboard.dismiss()
    setSelectedLine(null)
    setEditingLine(null)
    props.onReset()
    programRef.current?.scrollTo({ y: 0 })
  }
  const startCommand = (command: CommandTemplate) => {
    if (isRunning) return
    Keyboard.dismiss()
    setEditingLine(null)
    setConfiguringLine(null)
    if (needsConfiguration(command)) setPendingCommand(command)
    else insert(command.source)
  }

  const editParameters = (index: number) => {
    const line = descriptions[index]
    const command = allCommands.find(entry => entry.id === line?.text.split(/\s/)[0])
    if (isRunning || !command || !needsConfiguration(command)) return
    Keyboard.dismiss()
    setEditingLine(null)
    setConfiguringLine(index)
    setPendingCommand(command)
  }

  const commandCard = (command: CommandTemplate) => (
    <Pressable key={command.id} accessibilityRole="button"
      accessibilityLabel={'Añadir ' + command.label.toLowerCase()} accessibilityHint={command.description}
      disabled={isRunning} onPress={() => startCommand(command)}
      style={({ pressed }) => [styles.command, portrait && styles.commandPortrait, isRunning && styles.disabled, pressed && styles.pressed]}>
      <View style={styles.commandCopy}>
        <Text style={styles.commandTitle}>{command.label}</Text>
        {!portrait && <Text style={styles.commandSyntax}>{command.source[0]}</Text>}
      </View>
      <Plus size={13} color={colors.accentStrong} />
    </Pressable>
  )

  const controls = (
    <View testID="execution-controls" style={[styles.controls, portrait && styles.controlsPortrait]}>
      <View style={styles.primaryActions}>
        <ActionButton label="Reiniciar" icon={<RotateCcw size={16} color={colors.text} />}
          onPress={reset} style={styles.primaryButton} />
        <ActionButton label={isRunning ? 'Ejecutando' : 'Ejecutar'} variant="primary"
          icon={<Play size={16} color={colors.accentDark} />} disabled={isRunning}
          onPress={props.onRun} style={styles.primaryButton} />
      </View>
      <View style={styles.runnerControls}>
        <IconButton label="Retroceder un paso" onPress={props.onStepBack} disabled={isRunning} style={styles.stepButton}>
          <StepBack size={17} color={colors.accentStrong} />
        </IconButton>
        <IconButton label={props.isPaused ? 'Reanudar ejecución' : 'Pausar ejecución'}
          onPress={props.onPauseToggle} disabled={!isRunning && !props.isPaused} style={styles.stepButton}>
          {props.isPaused ? <Play size={17} color={colors.accentStrong} /> : <Pause size={17} color={colors.accentStrong} />}
        </IconButton>
        <IconButton label="Avanzar un paso" onPress={props.onStepForward} disabled={isRunning} style={styles.stepButton}>
          <StepForward size={17} color={colors.accentStrong} />
        </IconButton>
        <Pressable accessibilityRole="button" accessibilityLabel={'Velocidad x' + props.speedMultiplier}
          onPress={() => props.onSpeedChange(SPEEDS[(SPEEDS.indexOf(props.speedMultiplier) + 1) % SPEEDS.length]!)} style={styles.speed}>
          <Text style={styles.speedLabel}>VELOCIDAD</Text>
          <Text style={styles.speedValue}>×{props.speedMultiplier}</Text>
        </Pressable>
      </View>
    </View>
  )
  return (
    <View testID="code-editor" onLayout={event => setEditorWidth(event.nativeEvent.layout.width)}
      style={[styles.panel, portrait && styles.panelPortrait]}>
      {!portrait && (
        <View style={styles.toolbar}>
          <View style={styles.heading}><Terminal size={17} color={colors.accentStrong} /><Text style={styles.title}>Código Karel Pascal</Text></View>
          <View style={styles.toolbarActions}>
            <IconButton label="Objetivos y tutorial" onPress={props.onHelp}><Lightbulb size={17} color={colors.accentStrong} /></IconButton>
          </View>
        </View>
      )}
      {portrait && controls}
      <View style={[styles.columns, portrait && styles.columnsPortrait]}>
        <View testID="quick-commands" style={[styles.library, portrait && styles.libraryPortrait, showQuickCommandsTutorial && styles.libraryTutorial]}>
          <View style={styles.heading}><Plus size={16} color={colors.accentStrong} /><Text style={styles.headingText}>Comandos rápidos</Text></View>
          {!portrait && <Text style={styles.caption}>Pulsa para añadir al programa.</Text>}
          <ScrollView key={portrait ? 'horizontal-commands' : 'vertical-commands'} horizontal={portrait}
            style={styles.commandList} contentContainerStyle={portrait ? styles.commandStrip : styles.commandGroups}
            keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
            {portrait ? commands.map(commandCard) : GROUPS.filter(group => commands.some(command => command.group === group)).map(group => (
              <View key={group} style={styles.category}>
                <Text style={styles.categoryTitle}>{group.toUpperCase()}</Text>
                {commands.filter(command => command.group === group).map(commandCard)}
              </View>
            ))}
          </ScrollView>
        </View>
        <View style={[styles.program, portrait && styles.programPortrait]}>
          <View style={styles.heading}>
            <Code2 size={16} color={colors.accentStrong} /><Text style={styles.headingText}>Programa</Text>
            <Text style={styles.count}>{lines.length} líneas</Text>
          </View>
          <View style={styles.history}>
            <ActionButton label="Deshacer" icon={<Undo2 size={14} color={colors.blue} />}
              disabled={isRunning || !props.canUndo} onPress={props.onUndo} style={styles.historyButton} />
            <ActionButton label="Rehacer" icon={<Redo2 size={14} color={colors.blue} />}
              disabled={isRunning || !props.canRedo} onPress={props.onRedo} style={styles.historyButton} />
          </View>
          <View style={styles.lineTools}>
            <Text style={styles.lineSelection}>{selected ? 'L' + ((selectedLine ?? 0) + 1) : 'Línea'}</Text>
            <IconButton label="Subir línea seleccionada" disabled={isRunning || selectedLine === null || getSiblingIndex(descriptions, selectedLine, -1) === null} onPress={() => moveLine(-1)} style={styles.lineTool}>
              <ArrowUp size={16} color={colors.accentStrong} />
            </IconButton>
            <IconButton label="Bajar línea seleccionada" disabled={isRunning || selectedLine === null || getSiblingIndex(descriptions, selectedLine, 1) === null} onPress={() => moveLine(1)} style={styles.lineTool}>
              <ArrowDown size={16} color={colors.accentStrong} />
            </IconButton>
            <IconButton label="Eliminar línea seleccionada" disabled={isRunning || !selected || selected.fixed} onPress={removeLine} style={styles.lineTool}>
              <Trash2 size={16} color={colors.error} />
            </IconButton>
            {selectedCommand && needsConfiguration(selectedCommand) && <IconButton label="Editar parámetros" disabled={isRunning} onPress={() => selectedLine !== null && editParameters(selectedLine)} style={styles.lineTool}>
              <Pencil size={16} color={colors.accentStrong} />
            </IconButton>}
          </View>
          {props.activeLoops.length > 0 && <View testID="loop-progress" style={styles.loopProgress}>
            {props.activeLoops.map((loop, index) => <Text key={index} style={styles.loopLabel}>
              {index > 0 ? '↳ ' : ''}Ciclo L{loop.lineNumber} · {loop.iteration}{loop.total ? '/' + loop.total : ''}
            </Text>)}
          </View>}
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
              const inLoop = props.activeLoops.some(loop => index + 1 >= loop.lineNumber && index + 1 <= loop.endLineNumber)
              const invalid = hasError && errorLine === index + 1
              return (
                <Pressable key={index} testID={'code-line-' + (index + 1)} accessibilityRole="button"
                  accessibilityLabel={'Seleccionar línea ' + (index + 1) + ': ' + line.text}
                  accessibilityState={{ selected: selectedLine === index }}
                  onPress={() => select(index)}
                  onLongPress={() => { if (!line.fixed && !isRunning) { setSelectedLine(index); if (line.opensBlock) editParameters(index); else setEditingLine(index) } }}
                  onLayout={event => {
                    rowLayouts.current.set(index, event.nativeEvent.layout)
                    if ((activeLineNumber === null && selectedLine === index) || active) revealLine(index)
                  }}
                  style={[styles.line, inLoop && styles.loopLine, line.opensBlock && styles.blockHeader, line.fixed && !portrait && styles.fixedLine, selectedLine === index && styles.selectedLine, active && styles.activeLine, invalid && styles.invalidLine]}>
                  <View style={styles.lineNumber}>
                    <Text style={[styles.lineNumberText, active && styles.activeNumber]}>{index + 1}</Text>
                    {active && <Play size={8} color={colors.accentStrong} />}
                  </View>
                  <View pointerEvents="none" style={styles.indentGuides}>{Array.from({ length: line.depth }, (_, guide) =>
                    <View key={guide} style={[styles.indentGuide, { left: 4 + guide * 14 }]} />)}</View>
                  {editingLine === index && !line.fixed && !isRunning ? (
                    <TextInput accessibilityLabel={'Editar línea ' + (index + 1)} value={lines[index]?.trimStart()}
                      autoFocus multiline autoCapitalize="none" autoCorrect={false} spellCheck={false}
                      style={[styles.lineInput, { paddingLeft: 4 + line.depth * 14 }]}
                      onChangeText={value => onChange(updateProgramLine(code, index, value))}
                      onBlur={() => setEditingLine(null)} />
                  ) : (
                    <Text style={[styles.lineText, { paddingLeft: 4 + line.depth * 14 }, line.fixed && styles.fixedText]}>
                      {lines[index]?.trimStart() || 'Escribe una instrucción…'}
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </ScrollView>
          <ActionButton label="Añadir línea" icon={<Plus size={14} color={colors.accentStrong} />}
            disabled={isRunning} onPress={addLine} style={styles.addLine} />
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
      {!portrait && controls}
      {pendingCommand && <CommandDialog command={pendingCommand} code={code} conditions={props.conditions} initialLine={configuringLine === null ? undefined : descriptions[configuringLine]?.text} onClose={() => setPendingCommand(null)}
        onInsert={source => {
          if (configuringLine === null) insert(source, pendingCommand.id === 'define-nueva-instruccion')
          else commit({ code: configureProgramLine(code, configuringLine, source[0]!), selected: configuringLine })
          setPendingCommand(null)
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
  library: { width: 158, padding: 10, borderRightWidth: 1, borderColor: colors.line, gap: 8 },
  libraryPortrait: { width: '100%', height: 98, padding: 8, paddingBottom: 6, borderRightWidth: 0 },
  libraryTutorial: { borderWidth: 2, borderColor: colors.accentStrong, backgroundColor: colors.successBg },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  commandList: { flex: 1, minHeight: 0 },
  commandStrip: { gap: 8, paddingBottom: 4, paddingHorizontal: 2 },
  commandGroups: { paddingBottom: 6, gap: 16 },
  category: { gap: 6 },
  categoryTitle: { color: colors.muted, fontSize: 10, fontWeight: '800', marginBottom: 1 },
  command: { minHeight: 56, padding: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.panelRaised, flexDirection: 'row', alignItems: 'center', gap: 5 },
  commandPortrait: { width: 106, height: 56, borderRadius: 8, borderColor: colors.mobileLine, paddingVertical: 7 },
  commandCopy: { flex: 1, minWidth: 0, gap: 4 },
  commandTitle: { fontSize: 11, fontWeight: '800', color: colors.text },
  commandSyntax: { fontFamily: codeFont, fontSize: 9, lineHeight: 13, color: colors.muted },
  program: { flex: 1, minWidth: 0, minHeight: 0, padding: 10, gap: 6 },
  programPortrait: { marginHorizontal: 8, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: colors.mobileLine, borderRadius: 8, backgroundColor: colors.panelRaised },
  count: { marginLeft: 'auto', fontSize: 10, color: colors.muted },
  history: { flexDirection: 'row', gap: 6, marginTop: 2 },
  historyButton: { flex: 1, minHeight: 36, paddingVertical: 5, backgroundColor: '#f4f8f5' },
  lineTools: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  lineSelection: { fontSize: 11, color: colors.muted, minWidth: 34, marginRight: 'auto' },
  lineTool: { width: 36, height: 36, backgroundColor: '#f4f8f5' },
  lineList: { flex: 1, minHeight: 0 },
  lineContent: { gap: 5, padding: 2 },
  line: { minHeight: 40, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderLeftWidth: 3, borderRadius: 7, backgroundColor: colors.panelRaised },
  loopProgress: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  loopLabel: { color: colors.accentStrong, backgroundColor: colors.successBg, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, fontSize: 10, fontWeight: '700' },
  loopLine: { backgroundColor: '#eefaf4', borderLeftColor: colors.accentStrong },
  blockHeader: { borderLeftColor: colors.blue },
  indentGuides: { position: 'absolute', left: 26, top: 0, bottom: 0 },
  indentGuide: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#b8d7c9' },
  fixedLine: { borderColor: 'transparent', backgroundColor: 'transparent' },
  selectedLine: { borderColor: colors.blue },
  activeLine: { borderColor: colors.accentStrong, backgroundColor: colors.successBg },
  invalidLine: { borderColor: colors.error, backgroundColor: colors.errorBg },
  lineNumber: { width: 26, alignItems: 'center', justifyContent: 'center', gap: 2 },
  lineNumberText: { fontSize: 10, color: colors.muted, fontFamily: codeFont },
  activeNumber: { color: colors.accentStrong },
  lineText: { flex: 1, minWidth: 0, paddingVertical: 8, paddingRight: 4, fontSize: 11, lineHeight: 17, fontFamily: codeFont, color: colors.text },
  fixedText: { color: colors.muted },
  lineInput: { flex: 1, minWidth: 0, minHeight: 36, paddingVertical: 6, fontSize: 12, lineHeight: 18, fontFamily: codeFont, color: colors.text, textAlignVertical: 'top' },
  addLine: { minHeight: 38, borderStyle: 'dashed', marginTop: 2, paddingVertical: 6 },
  help: { width: 158, flexGrow: 0, flexShrink: 0, borderLeftWidth: 1, borderColor: colors.line },
  helpContent: { padding: 12, gap: 10 },
  helpKicker: { marginTop: 16, fontSize: 10, fontWeight: '800', color: colors.accentStrong },
  helpTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: colors.text },
  helpBody: { fontSize: 12, lineHeight: 20, color: colors.muted },
  helpCode: { fontFamily: codeFont, fontSize: 10, lineHeight: 17, color: colors.accentStrong, backgroundColor: colors.panelSoft, padding: 8, borderRadius: 7 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  controlsPortrait: { padding: 8, borderTopWidth: 1, borderColor: colors.mobileLine },
  primaryActions: { flexDirection: 'row', gap: 8, flexGrow: 1 },
  primaryButton: { flexGrow: 1 },
  runnerControls: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepButton: { width: 40, height: 44, borderColor: '#b8dfcf', backgroundColor: '#effbf5' },
  speed: { minWidth: 70, height: 44, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#253b35', alignItems: 'center', justifyContent: 'center', gap: 2 },
  speedLabel: { color: '#cbd5e1', fontSize: 8, fontWeight: '800' },
  speedValue: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
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
})
