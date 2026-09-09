import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Lightbulb,
  Pause,
  Pencil,
  Play,
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
import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
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
  const [editingLine, setEditingLine] = useState<number | null>(null);
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
  const focusRequestRef = useRef<number | null>(null);
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
  const insertionIndex =
    isMobile && selected && !selected.fixed && !selected.opensBlock
      ? (selectedLine ?? 0)
      : getInsertionIndex(descriptions, selected ? selectedLine : null);
  const hasError = Boolean(executionError || (compileResult && !compileResult.success));
  const errorLine = executionError ? activeLineNumber : compileResult?.error?.line;
  const isExecutionMode = isRunning || isPaused;
  const isLevelFourCommandLibrary = levelId === 4;
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
      if (event.key === 'Escape') setPendingCommand(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pendingCommand]);

  const selectLine = (index: number) => {
    if (focusRequestRef.current !== null) window.cancelAnimationFrame(focusRequestRef.current);
    focusRequestRef.current = null;
    setSelectedLine(index);
  };

  const resetProgram = () => {
    if (focusRequestRef.current !== null) window.cancelAnimationFrame(focusRequestRef.current);
    focusRequestRef.current = null;
    setSelectedLine(null);
    setEditingLine(null);
    if (programRef.current) programRef.current.scrollTop = 0;
    onReset();
  };

  const focusLine = (index: number, edit = !isMobile) => {
    selectLine(index);
    setEditingLine(edit ? index : null);
    focusRequestRef.current = window.requestAnimationFrame(() => {
      focusRequestRef.current = null;
      const input = programRef.current?.querySelector<HTMLInputElement>(
        `[data-line-input="${index}"]`
      );
      // Chip insertion and reordering must not summon the phone's software keyboard.
      (edit ? input : input?.closest('li'))?.focus({ preventScroll: true });
    });
  };

  const insertLines = (source: string[], index = insertionIndex, replaceSelection = true) => {
    if (isRunning) return;
    const result = insertProgramLines(code, source, selectedLine, { index, replaceSelection });
    onChange(result.code);
    focusLine(result.selected, false);
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
    insertLines(command.source);
  };

  const editParameters = (index: number) => {
    const line = descriptions[index];
    const command = allCommands.find(entry => entry.id === line?.text.split(/\s/)[0]);
    if (isRunning || !command || !needsConfiguration(command)) return;
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
      setPendingCommand(null);
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

  const updateLine = (index: number, value: string) => {
    if (isRunning) return;
    const nextLines = [...lines];
    const indentation = lines[index]?.match(/^\s*/)?.[0] ?? '';
    nextLines[index] = `${indentation}${value}`;
    onChange(nextLines.join('\n'));
  };

  const moveLine = (index: number, direction: -1 | 1) => {
    if (isRunning) return;
    const result = moveCodeBlock(code, index, direction);
    onChange(result.code);
    focusLine(result.selected);
  };

  const deleteLine = (index: number) => {
    if (isRunning) return;
    const nextCode = removeCodeBlock(code, index);
    onChange(nextCode);
    focusLine(Math.min(index, nextCode.split('\n').length - 1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      insertLines([''], getInsertionIndex(descriptions, index), false);
    } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      moveLine(index, event.key === 'ArrowUp' ? -1 : 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = event.clipboardData.getData('text').replace(/\r\n?/g, '\n');
    if (!pasted.includes('\n') || isRunning) return;
    event.preventDefault();
    const input = event.currentTarget;
    const merged =
      input.value.slice(0, input.selectionStart ?? 0) +
      pasted +
      input.value.slice(input.selectionEnd ?? input.value.length);
    const indentation = lines[index]?.match(/^\s*/)?.[0] ?? '';
    const nextLines = [...lines];
    const pastedLines = merged.split('\n');
    nextLines.splice(index, 1, ...pastedLines.map((line) => `${indentation}${line}`));
    onChange(nextLines.join('\n'));
    focusLine(index + pastedLines.length - 1);
  };

  return (
    <section
      className={`karel-editor-panel structured-editor ${isExecutionMode ? 'execution-active' : ''} ${tutorialFocus ? `karel-editor-panel-tutorial karel-editor-panel-tutorial-${tutorialFocus}` : ''}`}
      aria-label="Editor de código Karel"
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
        className={`code-editor-columns ${tutorialFocus === 'code' ? 'tutorial-target-spotlight' : ''}`}
      >
        <section
          className={`command-library ${isLevelFourCommandLibrary ? 'command-library-level-4' : ''}`}
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
          <p className="editor-column-caption">Pulsa para añadir al programa.</p>
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
                      aria-label={`Añadir ${command.label.toLowerCase()}`}
                    >
                      <span>
                        {command.label}
                        <code>{command.source[0]}</code>
                      </span>
                      <Plus size={13} aria-hidden="true" />
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </section>

        <section className="line-program" aria-labelledby="line-program-title">
          <header className="editor-column-heading">
            <Code2 size={16} />
            <h2 id="line-program-title">Programa</h2>
            <span>{lines.length} líneas</span>
          </header>
          <div className="line-program-tools" role="group" aria-label="Acciones del código">
            <button
              className="line-program-tool-button"
              type="button"
              onClick={onUndo}
              disabled={isRunning || !canUndo}
              title="Deshacer cambio"
              aria-label="Deshacer cambio en el código"
            >
              <Undo2 size={14} />
              <span>Deshacer</span>
            </button>
            <button
              className="line-program-tool-button"
              type="button"
              onClick={onRedo}
              disabled={isRunning || !canRedo}
              title="Rehacer cambio"
              aria-label="Rehacer cambio en el código"
            >
              <Redo2 size={14} />
              <span>Rehacer</span>
            </button>
          </div>
          {isMobile && (
            <div
              className="mobile-line-toolbar"
              role="group"
              aria-label="Acciones de la línea seleccionada"
            >
              <span>{selected ? `L${(selectedLine ?? 0) + 1}` : 'Línea'}</span>
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
                <ArrowUp size={16} />
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
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label="Eliminar línea seleccionada"
                disabled={isRunning || !selected || selected.fixed}
                onClick={() => selectedLine !== null && deleteLine(selectedLine)}
              >
                <Trash2 size={16} />
              </button>
              {selectedCommand && needsConfiguration(selectedCommand) && <button
                type="button" aria-label="Editar parámetros" disabled={isRunning}
                onClick={() => selectedLine !== null && editParameters(selectedLine)}>
                <Pencil size={16} />
              </button>}
            </div>
          )}
          <p className="editor-column-caption" id="line-program-hint">
            {isRunning
              ? 'Programa en ejecución. Pausa para editar.'
              : selected && !selected.fixed
                ? `El siguiente comando reemplazará ${selected.opensBlock ? 'el bloque' : 'la línea'} ${selectedLine === null ? '' : selectedLine + 1}.`
                : `El siguiente comando se insertará antes de la línea ${insertionIndex + 1}.`}
          </p>
          <ol className="code-line-list" ref={programRef} aria-describedby="line-program-hint">
            {descriptions.map((line, index) => {
              const active = activeLineNumber === index + 1;
              const inLoop = activeLoops.some(loop => index + 1 >= loop.lineNumber && index + 1 <= loop.endLineNumber);
              const lineLoops = activeLoops.filter(loop => loop.lineNumber === index + 1);
              const invalid = hasError && errorLine === index + 1;
              return (
                <li
                  key={index}
                  className={`code-line-block ${line.fixed ? 'code-line-fixed' : ''} ${inLoop ? 'in-loop' : ''} ${line.opensBlock ? 'block-header' : ''} ${selectedLine === index ? 'selected' : ''} ${active ? 'active' : ''} ${invalid ? 'invalid' : ''}`}
                  aria-current={active ? 'step' : undefined}
                  tabIndex={-1}
                  onClick={isMobile ? () => selectLine(index) : undefined}
                >
                  <span className="code-line-number" aria-hidden="true">
                    {index + 1}
                    {active && <Play size={8} />}
                  </span>
                  <span className="code-indent-guides" aria-hidden="true">{Array.from({ length: line.depth }, (_, guide) =>
                    <i key={guide} style={{ left: `${guide * 14 + 4}px` }} />)}</span>
                  <input
                    data-line-input={index}
                    className="code-line-input"
                    style={{
                      paddingInlineStart: `${line.depth * 14 + 4}px`,
                    }}
                    aria-label={`Línea ${index + 1}${line.fixed ? ', estructura del programa' : ''}`}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? 'karel-compile-result' : undefined}
                    value={lines[index]?.trimStart() ?? ''}
                    readOnly={line.fixed || isRunning || (isMobile && editingLine !== index)}
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                    placeholder="Escribe una instrucción…"
                    onFocus={() => selectLine(index)}
                    onBlur={() => setEditingLine(null)}
                    onDoubleClick={() => {
                      if (line.opensBlock) editParameters(index);
                      else if (isMobile && !line.fixed && !isRunning) focusLine(index, true);
                    }}
                    onChange={(event) => updateLine(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (!line.fixed) handleKeyDown(event, index);
                    }}
                    onPaste={(event) => {
                      if (!line.fixed) handlePaste(event, index);
                    }}
                  />
                  <div className="code-line-end">
                    {lineLoops.map((loop, loopIndex) => (
                      <span className="loop-progress" key={`${loop.lineNumber}-${loopIndex}`} aria-label={`Iteración ${loop.iteration} de ${loop.total ?? 'sin límite definido'}`}>
                        {loop.iteration}/{loop.total ?? '∞'}
                      </span>
                    ))}
                    {!line.fixed && !isMobile && (
                      <div className="code-line-actions">
                      {line.opensBlock && <button type="button" aria-label={`Editar parámetros de línea ${index + 1}`} disabled={isRunning} onClick={() => editParameters(index)}><Pencil size={13} /></button>}
                      <button
                        type="button"
                        aria-label={`Subir línea ${index + 1}`}
                        title="Subir bloque (Alt + ↑)"
                        disabled={isRunning || getSiblingIndex(descriptions, index, -1) === null}
                        onClick={() => moveLine(index, -1)}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar línea ${index + 1}`}
                        title="Bajar bloque (Alt + ↓)"
                        disabled={isRunning || getSiblingIndex(descriptions, index, 1) === null}
                        onClick={() => moveLine(index, 1)}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar línea ${index + 1}${line.opensBlock ? ' y su bloque' : ''}`}
                        title={line.opensBlock ? 'Eliminar bloque completo' : 'Eliminar línea'}
                        disabled={isRunning}
                        onClick={() => deleteLine(index)}
                      >
                        <Trash2 size={13} />
                      </button>
                      </div>
                    )}
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
              <Play size={20} />
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
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
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
              <Play size={15} />
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
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
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
          onMouseDown={() => setPendingCommand(null)}
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
                onClick={() => setPendingCommand(null)}
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
              <label className="control-command-field">
                <span>Veces</span>
                <input
                  type="number"
                  min={1}
                  value={repeatCount}
                  onChange={(event) => setRepeatCount(Number(event.target.value))}
                />
              </label>
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
              <button className="control-command-cancel" type="button" onClick={() => setPendingCommand(null)}>
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
                {configuringLine === null ? 'Insertar' : 'Guardar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
