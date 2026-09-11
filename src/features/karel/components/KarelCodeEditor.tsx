import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  Lightbulb,
  Pause,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  StepBack,
  StepForward,
  Terminal,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { PlayArrow } from './PlayArrow';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { KarelLevel } from '@shared/types';
import type { CompileResult, ExecutionLoop, KarelSpeedMultiplier } from '@features/karel/hooks/use-karel-runner';
import {
  COMMAND_TEMPLATES,
  describeCodeLines,
  getCustomCommands,
  getQuickCommands,
  getInsertionIndex,
  getSiblingIndex,
  moveCodeBlock,
  removeCodeBlock,
} from '../editor/code-lines';
import type { CommandTemplate } from '../editor/code-lines';
import { configureProgramLine, insertProgramLines } from '../editor/edit-program';
import { CONDITION_OPTIONS, getConditionOptions, needsConfiguration, validateProcedureName } from '../editor/command-config';
import { TUTORIAL_COPY } from '../editor/tutorial';
import './KarelCodeEditor.css';

interface KarelCodeEditorProps {
  levelId: number;
  quickCommands: KarelLevel['quickCommands'];
  conditions: KarelLevel['conditions'];
  code: string;
  activeLoops: ExecutionLoop[];
  activeLineNumber: number | null;
  compileResult: CompileResult | null;
  executionError: string | null;
  isRunning: boolean;
  isPaused: boolean;
  isApplyingCode?: boolean;
  speedMultiplier: KarelSpeedMultiplier;
  isMobile: boolean;
  onHelp: () => void;
  onChange: (code: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRun: () => void;
  onReset: () => void;
  onPauseToggle: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSpeedChange: (speedMultiplier: KarelSpeedMultiplier) => void;
  tutorialFocus?: KarelTutorialFocus;
  onTutorialNext?: () => void;
  onTutorialPrevious?: () => void;
  onTutorialDismiss?: () => void;
}

type KarelTutorialFocus = 'quickCommands' | 'code' | 'runner' | 'reset' | null;

const COMMAND_GROUPS = ['Movimiento', 'Fichas', 'Control', 'Mis instrucciones'] as const;
const SPEEDS: KarelSpeedMultiplier[] = [1, 1.5, 2, 0.5];
const LOOP_NEON_LEVELS = 3;
const EMPTY_PROGRAM = 'iniciar-programa\nfinalizar-programa';

export function KarelCodeEditor({
  levelId,
  quickCommands,
  conditions,
  code,
  activeLineNumber,
  activeLoops,
  compileResult,
  executionError,
  isRunning,
  isPaused,
  isApplyingCode = false,
  speedMultiplier,
  isMobile,
  onHelp,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRun,
  onReset,
  onPauseToggle,
  onStepBack,
  onStepForward,
  onSpeedChange,
  tutorialFocus = null,
  onTutorialNext,
  onTutorialPrevious,
  onTutorialDismiss,
}: KarelCodeEditorProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [replacementLine, setReplacementLine] = useState<number | null>(null);
  const [isProgramExpanded, setIsProgramExpanded] = useState(false);
  const [configuringLine, setConfiguringLine] = useState<number | null>(null);
  const [pendingCommand, setPendingCommand] = useState<CommandTemplate | null>(null);
  const [selectedCondition, setSelectedCondition] =
    useState<(typeof CONDITION_OPTIONS)[number]['value']>('frente-libre');
  const [repeatCount, setRepeatCount] = useState(2);
  const [procedureName, setProcedureName] = useState('mi-instruccion');
  const programRef = useRef<HTMLOListElement>(null);
  const tutorialRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const commandLibraryRef = useRef<HTMLDivElement>(null);
  const commandSectionRef = useRef<HTMLElement>(null);
  const focusRequestRef = useRef<number | null>(null);
  const programDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [canScrollCommandsBack, setCanScrollCommandsBack] = useState(false);
  const [canScrollCommandsForward, setCanScrollCommandsForward] = useState(false);
  const lines = code.split('\n');
  const descriptions = describeCodeLines(code);
  const allCommands = [...COMMAND_TEMPLATES, ...getCustomCommands(descriptions)];
  const commands = getQuickCommands(descriptions, quickCommands);
  const conditionOptions = getConditionOptions(conditions, configuringLine === null ? undefined : descriptions[configuringLine]?.text);
  const selected = selectedLine === null ? undefined : descriptions[selectedLine];
  const selectedCommandId = selected?.text.split(/[\s;]/)[0]?.replace('-zumbador', '-ficha');
  const selectedCommand = allCommands.find(
    (command) => selectedCommandId === command.id
  );
  const pendingCommandNeedsCondition = pendingCommand?.id === 'si' || pendingCommand?.id === 'mientras';
  const repeatCountIsValid = Number.isSafeInteger(repeatCount) && repeatCount >= 1;
  const procedureError = validateProcedureName(procedureName, code, configuringLine === null ? undefined : descriptions[configuringLine]?.text.match(/^define-nueva-instruccion\s+([\w-]+)/)?.[1]);
  const procedureNameIsValid = !procedureError;
  const tutorialCopy = tutorialFocus ? TUTORIAL_COPY[tutorialFocus] : null;
  const insertionIndex = getInsertionIndex(descriptions, selected ? selectedLine : null);
  const hasError = Boolean(executionError || (compileResult && !compileResult.success));
  const errorLine = executionError ? activeLineNumber : compileResult?.error?.line;
  const isExecutionMode = isRunning || isPaused;
  const isLevelFourCommandLibrary = levelId === 4;

  const startProgramDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    programDragStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveProgramDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const start = programDragStartRef.current;
    if (!start) return;
    const deltaY = event.clientY - start.y;
    if ((!isProgramExpanded && deltaY > -24) || (isProgramExpanded && deltaY < 24)) return;
    programDragStartRef.current = null;
    setIsProgramExpanded(!isProgramExpanded);
  };
  const endProgramDrag = () => {
    programDragStartRef.current = null;
  };
  const isQuickCommandsTutorial = tutorialFocus === 'quickCommands';

  const updateCommandScrollState = () => {
    const list = commandLibraryRef.current;
    if (!list) return;
    setCanScrollCommandsBack(list.scrollLeft > 1);
    setCanScrollCommandsForward(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
  };

  const scrollQuickCommands = (direction: -1 | 1) => {
    const list = commandLibraryRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * Math.max(140, list.clientWidth * 0.65), behavior: 'smooth' });
    window.setTimeout(updateCommandScrollState, 240);
  };

  useEffect(() => {
    const lineIndex = activeLineNumber === null ? selectedLine : activeLineNumber - 1;
    if (lineIndex === null) return;
    const list = programRef.current;
    const row = list?.children[lineIndex] as HTMLElement | undefined;
    if (!list || !row) return;
    // Scroll only the program, keeping the map and playback controls in place.
    const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    if (offset < 0) list.scrollTop += offset;
    else if (offset + row.offsetHeight > list.clientHeight)
      list.scrollTop += offset + row.offsetHeight - list.clientHeight;
  }, [activeLineNumber, selectedLine, code]);

  useEffect(() => {
    if (!isMobile || !isLevelFourCommandLibrary) return;
    const list = commandLibraryRef.current;
    if (!list) return;
    const observer = new ResizeObserver(updateCommandScrollState);
    observer.observe(list);
    updateCommandScrollState();
    return () => observer.disconnect();
  }, [isMobile, isLevelFourCommandLibrary, commands.length]);

  useEffect(() => {
    const target =
      tutorialFocus === 'runner' || tutorialFocus === 'reset'
        ? actionsRef.current
        : tutorialRef.current;
    target?.scrollIntoView({ block: 'nearest' });
  }, [tutorialFocus]);

  useEffect(
    () => () => {
      if (focusRequestRef.current !== null) window.cancelAnimationFrame(focusRequestRef.current);
    },
    []
  );

  useEffect(() => {
    if (!pendingCommand) return undefined;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingCommand(null);
        setConfiguringLine(null);
        setReplacementLine(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pendingCommand]);

  useEffect(() => {
    if (replacementLine !== null && (replacementLine >= descriptions.length || isRunning)) {
      setReplacementLine(null);
    }
  }, [descriptions.length, isRunning, replacementLine]);

  const selectLine = (index: number) => {
    if (focusRequestRef.current !== null) window.cancelAnimationFrame(focusRequestRef.current);
    focusRequestRef.current = null;
    if (replacementLine !== null && replacementLine !== index) setReplacementLine(null);
    setSelectedLine(index);
  };

  const resetProgram = () => {
    if (focusRequestRef.current !== null) window.cancelAnimationFrame(focusRequestRef.current);
    focusRequestRef.current = null;
    setSelectedLine(null);
    setReplacementLine(null);
    if (programRef.current) programRef.current.scrollTop = 0;
    onReset();
  };

  const focusLine = (index: number) => {
    selectLine(index);
    focusRequestRef.current = window.requestAnimationFrame(() => {
      focusRequestRef.current = null;
      const line = programRef.current?.querySelector<HTMLElement>(
        `[data-line-content="${index}"]`
      );
      line?.focus({ preventScroll: true });
    });
  };

  const insertLines = (source: string[], index = insertionIndex, replaceSelection = false) => {
    if (isRunning) return;
    const result = insertProgramLines(code, source, selectedLine, { index, replaceSelection });
    onChange(result.code);
    focusLine(result.selected);
  };

  const insertCommand = (command: CommandTemplate) => {
    if (isRunning) return;
    setConfiguringLine(null);
    if (needsConfiguration(command)) {
      setPendingCommand(command);
      if (command.id === 'si' || command.id === 'mientras') setSelectedCondition(conditions[0] ?? 'frente-libre');
      if (command.id === 'repetir') setRepeatCount(2);
      if (command.id === 'define-nueva-instruccion') {
        let name = 'mi-instruccion';
        let suffix = 2;
        while (commands.some((entry) => entry.id === name)) name = `mi-instruccion-${suffix++}`;
        setProcedureName(name);
      }
      return;
    }
    if (replacementLine !== null) {
      const result = insertProgramLines(code, command.source, replacementLine, {
        index: replacementLine,
        replaceSelection: true,
      });
      setReplacementLine(null);
      onChange(result.code);
      focusLine(result.selected);
      return;
    }
    insertLines(command.source, insertionIndex, false);
  };

  const beginReplacement = () => {
    if (isRunning || selectedLine === null || !selected || selected.fixed) return;
    setConfiguringLine(null);
    setPendingCommand(null);
    setReplacementLine(current => current === selectedLine ? null : selectedLine);
    window.requestAnimationFrame(() => {
      commandSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const editParameters = (index: number) => {
    const line = descriptions[index];
    const command = allCommands.find(entry => entry.id === line?.text.split(/\s/)[0]);
    if (isRunning || !command || !needsConfiguration(command)) return;
    setReplacementLine(null);
    setConfiguringLine(index);
    setPendingCommand(command);
    setSelectedCondition(CONDITION_OPTIONS.find(option => line?.text.includes(option.value))?.value ?? 'frente-libre');
    setRepeatCount(Number(line?.text.match(/^repetir\s+(\d+)/)?.[1] ?? 2));
    setProcedureName(line?.text.match(/^define-nueva-instruccion\s+([\w-]+)/)?.[1] ?? 'mi-instruccion');
  };

  const getConditionBodyLine = () => {
    if (selectedCondition === 'junto-a-ficha') return 'coge-ficha;';
    if (selectedCondition === 'orientado-al-norte') return 'gira-izquierda;';
    return 'avanza;';
  };

  const getPendingCommandSource = () => {
    if (!pendingCommand) return [];
    if (pendingCommand.id === 'si') {
      return [`si ${selectedCondition} entonces inicio`, `  ${getConditionBodyLine()}`, 'fin;'];
    }
    if (pendingCommand.id === 'mientras') {
      return [`mientras ${selectedCondition} hacer inicio`, `  ${getConditionBodyLine()}`, 'fin;'];
    }
    if (pendingCommand.id === 'repetir') {
      return [`repetir ${Math.max(1, Math.floor(repeatCount))} veces inicio`, '  avanza;', 'fin;'];
    }
    if (pendingCommand.id === 'define-nueva-instruccion') {
      const name = procedureNameIsValid ? procedureName.trim() : 'mi-instruccion';
      return pendingCommand.source.map((line) => line.replace('mi-instruccion', name));
    }
    return pendingCommand.source;
  };

  const insertConfiguredCommand = () => {
    if (!pendingCommand) return;
    if (pendingCommand.id === 'repetir' && !repeatCountIsValid) return;
    if (pendingCommand.id === 'define-nueva-instruccion' && !procedureNameIsValid) return;
    if (configuringLine !== null) {
      onChange(configureProgramLine(code, configuringLine, getPendingCommandSource()[0]!));
      setConfiguringLine(null);
      setPendingCommand(null);
      return;
    }
    if (replacementLine !== null) {
      const result = insertProgramLines(code, getPendingCommandSource(), replacementLine, {
        index: replacementLine,
        replaceSelection: true,
      });
      setReplacementLine(null);
      setPendingCommand(null);
      onChange(result.code);
      focusLine(result.selected);
      return;
    }
    if (pendingCommand.id !== 'define-nueva-instruccion') {
      insertLines(getPendingCommandSource());
      setPendingCommand(null);
      return;
    }
    insertLines(getPendingCommandSource(), 1, false);
    setPendingCommand(null);
  };

  const closeCommandDialog = () => {
    setPendingCommand(null);
    setConfiguringLine(null);
    setReplacementLine(null);
  };

  const moveLine = (index: number, direction: -1 | 1) => {
    if (isRunning) return;
    const result = moveCodeBlock(code, index, direction);
    setReplacementLine(null);
    onChange(result.code);
    focusLine(result.selected);
  };

  const deleteLine = (index: number) => {
    if (isRunning) return;
    const nextCode = removeCodeBlock(code, index);
    setReplacementLine(null);
    onChange(nextCode);
    focusLine(Math.min(index, nextCode.split('\n').length - 1));
  };

  const clearProgram = () => {
    if (isRunning || code === EMPTY_PROGRAM) return;
    setSelectedLine(null);
    setReplacementLine(null);
    setConfiguringLine(null);
    setPendingCommand(null);
    onChange(EMPTY_PROGRAM);
  };

  return (
    <section
      className={`karel-editor-panel structured-editor ${isProgramExpanded ? 'program-expanded' : ''} ${isExecutionMode ? 'execution-active' : ''} ${isApplyingCode ? 'is-applying-code' : ''} ${tutorialFocus ? `karel-editor-panel-tutorial karel-editor-panel-tutorial-${tutorialFocus}` : ''}`}
      aria-label="Editor de código Karel"
      aria-busy={isApplyingCode}
      onClick={(event) => {
        if (isProgramExpanded && !(event.target as HTMLElement).closest('.line-program')) setIsProgramExpanded(false);
      }}
    >
      <div className="karel-editor-toolbar">
        <span className="karel-editor-title">
          <Terminal size={17} /> Código Karel Pascal
        </span>
        <div className="karel-editor-toolbar-actions">
          <button
            className="editor-help-button"
            type="button"
            onClick={onHelp}
            aria-haspopup="dialog"
          >
            <Lightbulb size={14} /> Objetivos y tutorial
          </button>
        </div>
      </div>

      <div
        className={`code-editor-columns ${isProgramExpanded ? 'program-is-expanded' : ''} ${tutorialFocus === 'code' ? 'tutorial-target-spotlight' : ''}`}
      >
        <section
          ref={commandSectionRef}
          className={`command-library ${isLevelFourCommandLibrary ? 'command-library-level-4' : ''} ${replacementLine !== null ? 'command-library-edit-target' : ''}`}
          aria-labelledby="command-library-title"
        >
          <header className="editor-column-heading">
            <Plus size={16} />
            <h2 id="command-library-title">Comandos rápidos</h2>
            {isMobile && isLevelFourCommandLibrary && (
              <div className="quick-command-carousel-actions" aria-label="Navegar comandos rápidos">
                <button
                  className={`quick-command-carousel-button ${isQuickCommandsTutorial ? 'tutorial-target-spotlight' : ''}`}
                  type="button"
                  onClick={() => scrollQuickCommands(-1)}
                  disabled={!canScrollCommandsBack}
                  aria-label="Ver comandos anteriores"
                  title="Ver comandos anteriores"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  className={`quick-command-carousel-button ${isQuickCommandsTutorial ? 'tutorial-target-spotlight' : ''}`}
                  type="button"
                  onClick={() => scrollQuickCommands(1)}
                  disabled={!canScrollCommandsForward}
                  aria-label="Ver más comandos"
                  title="Ver más comandos"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </header>
          <p className="editor-column-caption">
            {replacementLine === null
              ? 'Pulsa para añadir al programa.'
              : `Elige el comando nuevo para la línea ${replacementLine + 1}.`}
          </p>
          <div className="command-library-list" ref={commandLibraryRef} onScroll={updateCommandScrollState}>
            {COMMAND_GROUPS.filter(group => commands.some(command => command.group === group)).map((group) => (
              <div className="command-category" key={group}>
                <h3>{group}</h3>
                {commands
                  .filter((command) => command.group === group)
                  .map((command) => (
                    <button
                      className="command-block-button"
                      type="button"
                      key={command.id}
                      onClick={() => insertCommand(command)}
                      disabled={isRunning}
                      title={command.description}
                      aria-label={replacementLine === null
                        ? `Añadir ${command.label.toLowerCase()}`
                        : `Cambiar la línea ${replacementLine + 1} a ${command.label.toLowerCase()}`}
                    >
                      <span>
                        {command.label}
                        <code>{command.source[0]}</code>
                      </span>
                      {replacementLine === null
                        ? <Plus size={13} aria-hidden="true" />
                        : <Pencil size={13} aria-hidden="true" />}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </section>

        <section className={`line-program ${isProgramExpanded ? 'is-expanded' : ''}`} aria-labelledby="line-program-title"
          onClick={(event) => event.stopPropagation()}>
          {isApplyingCode && (
            <div className="code-application-overlay" role="status" aria-live="polite">
              <div className="code-application-scanner" aria-hidden="true" />
              <div className="code-application-copy">
                <span>Cargando la sugerencia…</span>
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          <header className="editor-column-heading program-heading program-drag-handle"
            title={isProgramExpanded ? 'Arrastra hacia abajo para contraer el programa' : 'Arrastra hacia arriba para ampliar el programa'}
            onPointerDown={startProgramDrag} onPointerMove={moveProgramDrag}
            onPointerUp={endProgramDrag} onPointerCancel={endProgramDrag}>
            <Code2 size={16} />
            <h2 id="line-program-title">Programa</h2>
            {isProgramExpanded && (
              <button className="program-collapse-button" type="button" aria-label="Contraer programa"
                title="Contraer programa" onClick={() => setIsProgramExpanded(false)}>
                <ChevronDown size={16} />
              </button>
            )}
            <div
              className="program-line-tools"
              role="group"
              aria-label="Historial y acciones de la línea seleccionada"
            >
              <button type="button" aria-label="Deshacer cambio en el código" title="Deshacer"
                disabled={isRunning || !canUndo} onClick={() => { setReplacementLine(null); onUndo(); }}>
                <Undo2 size={15} />
              </button>
              <button type="button" aria-label="Rehacer cambio en el código" title="Rehacer"
                disabled={isRunning || !canRedo} onClick={() => { setReplacementLine(null); onRedo(); }}>
                <Redo2 size={15} />
              </button>
              <button
                type="button"
                aria-label="Subir línea seleccionada"
                disabled={
                  isRunning ||
                  selectedLine === null ||
                  getSiblingIndex(descriptions, selectedLine, -1) === null
                }
                onClick={() => selectedLine !== null && moveLine(selectedLine, -1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                aria-label="Bajar línea seleccionada"
                disabled={
                  isRunning ||
                  selectedLine === null ||
                  getSiblingIndex(descriptions, selectedLine, 1) === null
                }
                onClick={() => selectedLine !== null && moveLine(selectedLine, 1)}
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                aria-label="Eliminar línea seleccionada"
                disabled={isRunning || !selected || selected.fixed}
                onClick={() => selectedLine !== null && deleteLine(selectedLine)}
              >
                <Trash2 size={15} />
              </button>
              <button
                className={replacementLine !== null ? 'is-editing' : ''}
                type="button"
                aria-label={replacementLine !== null ? 'Cancelar edición de la línea seleccionada' : 'Editar línea seleccionada con comandos rápidos'}
                aria-pressed={replacementLine !== null}
                disabled={isRunning || !selected || selected.fixed}
                onClick={beginReplacement}
              >
                <Pencil size={15} />
              </button>
              <button className="clear-program-button" type="button" aria-label="Borrar todo el código" title="Borrar todo"
                disabled={isRunning || code === EMPTY_PROGRAM} onClick={clearProgram}>
                <Trash2 size={14} /><span>Borrar todo</span>
              </button>
            </div>
          </header>
          <p className="editor-column-caption" id="line-program-hint">
            {isRunning
              ? 'Programa en ejecución. Pausa para editar.'
              : replacementLine !== null
                ? `Modo edición: elige en Comandos rápidos el reemplazo para la línea ${replacementLine + 1}.`
                : selected && !selected.fixed
                  ? `El siguiente comando se insertará después de la línea ${(selectedLine ?? 0) + 1}.`
                : `El siguiente comando se insertará antes de la línea ${insertionIndex + 1}.`}
          </p>
          <ol className="code-line-list" ref={programRef} aria-describedby="line-program-hint">
            {descriptions.map((line, index) => {
              const active = activeLineNumber === index + 1;
              const activeLoopDepth = activeLoops.filter(loop => index + 1 >= loop.lineNumber && index + 1 <= loop.endLineNumber).length;
              const inLoop = activeLoopDepth > 0;
              const lineLoops = activeLoops.filter(loop => loop.lineNumber === index + 1);
              const activeLoopBoundaries = activeLoops.slice(0, LOOP_NEON_LEVELS).map((loop, colorIndex) => ({
                loop,
                colorIndex,
                isStart: loop.lineNumber === index + 1,
                isEnd: loop.endLineNumber === index + 1,
              })).filter(boundary => boundary.isStart || boundary.isEnd);
              const invalid = hasError && errorLine === index + 1;
              return (
                <li
                  key={index}
                  className={`code-line-block ${line.fixed ? 'code-line-fixed' : ''} ${inLoop ? `in-loop in-loop-depth-${Math.min(3, activeLoopDepth)}` : ''} ${line.opensBlock ? 'block-header' : ''} ${selectedLine === index ? 'selected' : ''} ${active ? 'active' : ''} ${invalid ? 'invalid' : ''}`}
                  aria-current={active ? 'step' : undefined}
                  tabIndex={-1}
                  onClick={isMobile ? () => selectLine(index) : undefined}
                >
                  {activeLoopBoundaries.length > 0 && (
                    <span className="loop-neon-boundaries" aria-hidden="true">
                      {activeLoopBoundaries.map(({ loop, colorIndex, isStart, isEnd }) => (
                        <span
                          className={`loop-neon-boundary loop-neon-${colorIndex}`}
                          key={`${loop.lineNumber}-${loop.endLineNumber}`}
                          style={{ insetInline: `${14 + colorIndex * 10}px` }}
                        >
                          {isStart && <i className="loop-neon-stroke loop-neon-stroke-top" />}
                          {isEnd && <i className="loop-neon-stroke loop-neon-stroke-bottom" />}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="code-line-number" aria-hidden="true">
                    {index + 1}
                    {active && <PlayArrow size={8} />}
                  </span>
                  <span className="code-indent-guides" aria-hidden="true">{Array.from({ length: line.depth }, (_, guide) =>
                    <i key={guide} style={{ left: `${guide * 14 + 4}px` }} />)}</span>
                  <span
                    data-line-content={index}
                    className="code-line-content"
                    style={{
                      paddingInlineStart: `${line.depth * 14 + 4}px`,
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Línea ${index + 1}${line.fixed ? ', estructura del programa' : ''}`}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? 'karel-compile-result' : undefined}
                    aria-readonly="true"
                    onClick={() => selectLine(index)}
                    onFocus={() => selectLine(index)}
                    onDoubleClick={() => {
                      if (line.opensBlock) editParameters(index);
                    }}
                  >
                    {lines[index]?.trimStart() || 'Línea vacía'}
                  </span>
                  <div className="code-line-end">
                    {lineLoops.map((loop, loopIndex) => {
                      const colorIndex = Math.min(Math.max(0, activeLoops.findIndex(activeLoop =>
                        activeLoop.lineNumber === loop.lineNumber && activeLoop.endLineNumber === loop.endLineNumber,
                      )), LOOP_NEON_LEVELS - 1);
                      return <span className={`loop-progress loop-neon-${colorIndex}`} key={`${loop.lineNumber}-${loopIndex}`} aria-label={`Iteración ${loop.iteration} de ${loop.total ?? 'sin límite definido'}`}>
                        {loop.iteration}/{loop.total ?? '∞'}
                      </span>;
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
          <button
            className="add-program-line"
            type="button"
            onClick={() => insertLines([''], insertionIndex, false)}
            disabled={isRunning}
          >
            <Plus size={14} /> Añadir línea
          </button>
        </section>

        <aside className="code-line-help" aria-labelledby="code-line-help-title">
          <header className="editor-column-heading">
            <BookOpen size={16} />
            <h2 id="code-line-help-title">Ayuda</h2>
          </header>
          <div className="code-help-content" aria-live="polite">
            <span className="code-help-kicker">
              {selected ? `Línea ${(selectedLine ?? 0) + 1}` : 'Paso a paso'}
            </span>
            <h3>
              {selectedCommand?.label ??
                (selected?.fixed ? 'Estructura del programa' : 'Cada línea, una instrucción')}
            </h3>
            <p>
              {selectedCommand?.description ??
                (selected?.fixed
                  ? 'Estas líneas delimitan el programa y sus bloques. Al añadir, mover o eliminar un bloque, su cierre lo acompaña.'
                  : 'Elige un comando para añadirlo. Selecciona y edita una línea para adaptar el programa a tu objetivo.')}
            </p>
            {selectedCommand && (
              <pre>
                <code>{selectedCommand.source.join('\n')}</code>
              </pre>
            )}
            <div className="code-help-tip">
              <strong>Organiza tu solución</strong>
              <p>
                Las flechas mueven líneas o bloques completos. Enter añade una línea. También puedes
                pegar varias instrucciones.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {hasError && (
        <div
          id="karel-compile-result"
          role={hasError ? 'alert' : 'status'}
          className={`karel-compile-status ${hasError ? 'error' : 'success'}`}
        >
          {hasError
            ? `Error${errorLine ? ` en línea ${errorLine}` : ''}: ${executionError ?? compileResult?.error?.message ?? 'No se pudo ejecutar el programa.'}`
            : isRunning ? 'Programa en ejecución.' : isPaused ? 'Programa en pausa.' : 'Código válido.'}
        </div>
      )}

      {tutorialCopy && (
        <aside
          ref={tutorialRef}
          className={`tutorial-popover tutorial-popover-${tutorialFocus}`}
          role="status"
        >
          <strong>{tutorialCopy.title}</strong>
          <p>{tutorialCopy.body}</p>
          <div className="tutorial-popover-actions">
            <button className="tutorial-skip-button" type="button" onClick={onTutorialDismiss}>
              Omitir
            </button>
            {tutorialFocus !== 'quickCommands' && (
              <button className="tutorial-skip-button" type="button" onClick={onTutorialPrevious}>
                Anterior
              </button>
            )}
            <button className="tutorial-next-button" type="button" onClick={onTutorialNext}>
              {tutorialFocus === 'reset' || tutorialFocus === 'quickCommands' ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </aside>
      )}

      {isMobile ? (
        <div className="mobile-execution-dock" role="group" aria-label="Controles de ejecución">
          <div className="mobile-dock-primary">
            <button
              className="mobile-dock-compile"
              type="button"
              onClick={resetProgram}
            >
              <RotateCcw size={16} />
              <span>Reiniciar</span>
            </button>
            <button
              className="mobile-dock-play"
              type="button"
              onClick={onRun}
              disabled={isRunning}
            >
              <PlayArrow size={20} />
              <span>{isRunning ? 'Ejecutando' : 'Ejecutar'}</span>
            </button>
          </div>
          <div className="mobile-dock-secondary">
            <button
              className="mobile-dock-step-back"
              type="button"
              onClick={onStepBack}
              disabled={isRunning}
              aria-label="Retroceder un paso"
              title="Retroceder un paso"
            >
              <StepBack size={16} />
            </button>
            <button
              className={`mobile-dock-pause ${isRunning ? 'is-ready-to-pause' : ''} ${isPaused ? 'is-paused' : ''}`}
              type="button"
              onClick={onPauseToggle}
              disabled={!isRunning && !isPaused}
              aria-label={isPaused ? 'Reanudar ejecución' : 'Pausar ejecución'}
              title={isPaused ? 'Reanudar ejecución' : 'Pausar ejecución'}
            >
              {isPaused ? <PlayArrow size={16} /> : <Pause size={16} />}
            </button>
            <button
              className="mobile-dock-step-forward"
              type="button"
              onClick={onStepForward}
              disabled={isRunning}
              aria-label="Avanzar un paso"
              title="Avanzar un paso"
            >
              <StepForward size={16} />
            </button>
            <button
              className="mobile-dock-speed"
              type="button"
              onClick={() =>
                onSpeedChange(SPEEDS[(SPEEDS.indexOf(speedMultiplier) + 1) % SPEEDS.length] ?? 1)
              }
              aria-label={`Velocidad actual x${speedMultiplier}. Pulsar para cambiar.`}
            >
              <span className="speed-button-label">Velocidad</span>
              <span className="speed-button-value">×{speedMultiplier}</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={actionsRef}
          className={`karel-editor-actions ${tutorialFocus === 'runner' ? 'tutorial-target-spotlight' : ''}`}
        >
          <div className="editor-primary-actions">
            <button
              className={`editor-secondary-button ${tutorialFocus === 'reset' ? 'tutorial-target-spotlight' : ''}`}
              type="button"
              onClick={resetProgram}
            >
              <RotateCcw size={15} />
              Reiniciar
            </button>
            <button
              className={`editor-run-button ${tutorialFocus === 'reset' ? 'tutorial-target-spotlight' : ''}`}
              type="button"
              onClick={onRun}
              disabled={isRunning}
            >
              <PlayArrow size={15} />
              {isRunning ? 'Ejecutando' : 'Ejecutar'}
            </button>
          </div>
          <div
            className="runner-control-group"
            role="group"
            aria-label="Controles de tiempo y paso a paso"
          >
            <button
              className="runner-icon-button runner-step-back-button"
              type="button"
              onClick={onStepBack}
              disabled={isRunning}
              aria-label="Retroceder un paso"
              title="Retroceder un paso"
            >
              <StepBack size={16} />
            </button>
            <button
              className={`runner-icon-button runner-pause-button ${isRunning ? 'is-ready-to-pause' : ''} ${isPaused ? 'is-paused' : ''}`}
              type="button"
              onClick={onPauseToggle}
              disabled={!isRunning && !isPaused}
              aria-label={isPaused ? 'Reanudar ejecución' : 'Pausar ejecución'}
              title={isPaused ? 'Reanudar ejecución' : 'Pausar ejecución'}
            >
              {isPaused ? <PlayArrow size={16} /> : <Pause size={16} />}
            </button>
            <button
              className="runner-icon-button"
              type="button"
              onClick={onStepForward}
              disabled={isRunning}
              aria-label="Avanzar un paso"
              title="Avanzar un paso"
            >
              <StepForward size={16} />
            </button>
            <button
              className="runner-speed-button active"
              type="button"
              onClick={() =>
                onSpeedChange(SPEEDS[(SPEEDS.indexOf(speedMultiplier) + 1) % SPEEDS.length] ?? 1)
              }
              aria-label={`Velocidad actual x${speedMultiplier}. Pulsar para cambiar.`}
              title="Cambiar velocidad"
            >
              <span className="speed-button-label">Velocidad</span>
              <span className="speed-button-value">×{speedMultiplier}</span>
            </button>
          </div>
        </div>
      )}

      {pendingCommand && (
        <div
          className="control-command-backdrop"
          role="presentation"
          onMouseDown={closeCommandDialog}
        >
          <section
            className="control-command-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="control-command-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="control-command-header">
              <div>
                <span>{pendingCommand.group}</span>
                <h2 id="control-command-title">{pendingCommand.label}</h2>
              </div>
              <button
                type="button"
                onClick={closeCommandDialog}
                aria-label="Cerrar configuración"
              >
                <X size={17} />
              </button>
            </header>

            {pendingCommandNeedsCondition && (
              <div className="condition-option-grid" role="radiogroup" aria-label="Condición">
                {conditionOptions.map((condition) => (
                  <button
                    className={`condition-option-button ${selectedCondition === condition.value ? 'selected' : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={selectedCondition === condition.value}
                    key={condition.value}
                    onClick={() => setSelectedCondition(condition.value)}
                  >
                    <span>{condition.label}</span>
                    <code>{condition.value}</code>
                    <small>{condition.description}</small>
                  </button>
                ))}
              </div>
            )}

            {pendingCommand.id === 'repetir' && (
              <div className="control-command-field repeat-count-field">
                <span>Veces</span>
                <div className="repeat-count-stepper" role="group" aria-label="Número de repeticiones">
                  <button type="button" onClick={() => setRepeatCount((current) => current + 1)}
                    aria-label="Aumentar repeticiones"><ChevronUp size={24} /></button>
                  <output aria-live="polite" aria-label={`${repeatCount} repeticiones`}>{repeatCount}</output>
                  <button type="button" disabled={repeatCount <= 1}
                    onClick={() => setRepeatCount((current) => Math.max(1, current - 1))}
                    aria-label="Disminuir repeticiones"><ChevronDown size={24} /></button>
                </div>
              </div>
            )}

            {pendingCommand.id === 'define-nueva-instruccion' && (
              <label className="control-command-field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={procedureName}
                  onChange={(event) => setProcedureName(event.target.value)}
                  spellCheck={false}
                />
              </label>
            )}

            {pendingCommand.id === 'define-nueva-instruccion' && procedureError && <p role="alert">{procedureError}</p>}
            {pendingCommand.id === 'repetir' && !repeatCountIsValid && <p role="alert">Escribe un número entero mayor que cero.</p>}
            <pre className="control-command-preview">
              <code>{(configuringLine === null ? getPendingCommandSource() : getPendingCommandSource().slice(0, 1)).join('\n')}</code>
            </pre>

            <div className="control-command-actions">
              <button className="control-command-cancel" type="button" onClick={closeCommandDialog}>
                Cancelar
              </button>
              <button
                className="control-command-confirm"
                type="button"
                onClick={insertConfiguredCommand}
                disabled={
                  (pendingCommand.id === 'repetir' && !repeatCountIsValid) ||
                  (pendingCommand.id === 'define-nueva-instruccion' && !procedureNameIsValid)
                }
              >
                <Check size={15} />
                {replacementLine !== null ? 'Cambiar' : configuringLine === null ? 'Insertar' : 'Guardar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
