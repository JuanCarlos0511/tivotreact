import { Pause, Play, RotateCcw, Send, StepBack, StepForward, Terminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CompileResult, KarelSpeedMultiplier } from '@features/karel/hooks/use-karel-runner'

interface KarelCodeEditorProps {
  code: string
  activeLineNumber: number | null
  compileResult: CompileResult | null
  executionError: string | null
  isRunning: boolean
  isPaused: boolean
  speedMultiplier: KarelSpeedMultiplier
  onChange: (code: string) => void
  onCompile: () => void
  onRun: () => void
  onReset: () => void
  onPauseToggle: () => void
  onStepBack: () => void
  onStepForward: () => void
  onSpeedChange: (speedMultiplier: KarelSpeedMultiplier) => void
}

const QUICK_COMMANDS = ['avanza;', 'gira-izquierda;', 'coge-zumbador;', 'deja-zumbador;', 'apagate;'] as const

const getNextSpeed = (currentSpeed: KarelSpeedMultiplier): KarelSpeedMultiplier => {
  const cycle: KarelSpeedMultiplier[] = [1, 1.5, 2, 0.5]
  const currentIndex = cycle.indexOf(currentSpeed)
  return cycle[(currentIndex + 1) % cycle.length] ?? 1
}

export function KarelCodeEditor({
  code,
  activeLineNumber,
  compileResult,
  executionError,
  isRunning,
  isPaused,
  speedMultiplier,
  onChange,
  onCompile,
  onRun,
  onReset,
  onPauseToggle,
  onStepBack,
  onStepForward,
  onSpeedChange,
}: KarelCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const highlightRef = useRef<HTMLDivElement | null>(null)
  const [, forceFontRender] = useState(0)
  const lines = code.split('\n')

  useEffect(() => {
    if (!document.fonts) return

    void document.fonts.ready.then(() => {
      forceFontRender((current) => current + 1)
    })
  }, [])

  const syncHighlightScroll = () => {
    const textarea = textareaRef.current
    const highlight = highlightRef.current
    if (!textarea || !highlight) return

    highlight.scrollTop = textarea.scrollTop
    highlight.scrollLeft = textarea.scrollLeft
  }

  const insertCommand = (command: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      onChange(`${code}\n${command}`)
      return
    }

    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const nextCode = `${code.slice(0, selectionStart)}${command}${code.slice(selectionEnd)}`
    onChange(nextCode)

    window.requestAnimationFrame(() => {
      textarea.focus()
      const nextCursor = selectionStart + command.length
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  return (
    <section className="karel-editor-panel" aria-label="Editor de codigo Karel">
      <div className="karel-editor-toolbar">
        <span className="karel-editor-title">
          <Terminal size={15} />
          Codigo Karel Pascal
        </span>
        <button className="editor-reset-button" type="button" onClick={onReset}>
          <RotateCcw size={14} />
          Reiniciar
        </button>
      </div>
      <div className="quick-command-row" aria-label="Comandos rapidos">
        {QUICK_COMMANDS.map((command) => (
          <button key={command} type="button" className="quick-command-chip" onClick={() => insertCommand(command)}>
            {command}
          </button>
        ))}
      </div>
      {compileResult && (
        <div className={`karel-compile-status ${compileResult.success && !executionError ? 'success' : 'error'}`}>
          {compileResult.success && !executionError ? (
            compileResult.warning ? (
              `✓ Compilacion exitosa. ${compileResult.warning}`
            ) : (
              '✓ Compilacion exitosa. Codigo listo para ejecutar.'
            )
          ) : (
            `✕ Error${compileResult.error ? ` en linea ${compileResult.error.line}` : ''}: ${
                executionError ?? compileResult.error?.message ?? 'No se pudo ejecutar el programa'
              }`
          )}
        </div>
      )}
      <div className="karel-code-shell">
        <div ref={highlightRef} className="karel-code-highlight" aria-hidden="true">
          {lines.map((line, index) => {
            const lineNumber = index + 1
            const isActive = activeLineNumber === lineNumber

            return (
              <div key={`${lineNumber}-${line}`} className={`karel-code-row ${isActive ? 'active' : ''}`}>
                <span className="karel-line-number">{lineNumber}</span>
                <code>{line || ' '}</code>
              </div>
            )
          })}
        </div>
        <textarea
          ref={textareaRef}
          className="karel-code-textarea"
          value={code}
          onChange={(event) => onChange(event.target.value)}
          onScroll={syncHighlightScroll}
          spellCheck={false}
          wrap="off"
          rows={11}
        />
      </div>
      <div className="karel-editor-actions">
        <div className="editor-primary-actions">
          <button className="editor-secondary-button" type="button" onClick={onCompile} disabled={isRunning}>
            Compilar
          </button>
          <button className="editor-run-button" type="button" onClick={onRun} disabled={isRunning}>
            <Send size={15} />
            {isRunning ? 'Ejecutando' : 'Ejecutar'}
          </button>
        </div>
        <div className="runner-control-group" aria-label="Controles de ejecucion">
          <button
            className="runner-icon-button"
            type="button"
            onClick={onStepBack}
            disabled={isRunning}
            aria-label="Retroceder un paso"
            title="Retroceder un paso"
          >
            <StepBack size={14} />
          </button>
          <button
            className="runner-icon-button runner-pause-button"
            type="button"
            onClick={onPauseToggle}
            disabled={!isRunning && !isPaused}
            aria-label={isPaused ? 'Reanudar ejecucion' : 'Pausar ejecucion'}
            title={isPaused ? 'Reanudar ejecucion' : 'Pausar ejecucion'}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            className="runner-icon-button"
            type="button"
            onClick={onStepForward}
            disabled={isRunning}
            aria-label="Avanzar un paso"
            title="Avanzar un paso"
          >
            <StepForward size={14} />
          </button>
          <button
            className="runner-speed-button active"
            type="button"
            onClick={() => onSpeedChange(getNextSpeed(speedMultiplier))}
            aria-label={`Velocidad actual x${speedMultiplier}. Pulsar para cambiar.`}
            title={`Velocidad actual x${speedMultiplier}`}
          >
            x{speedMultiplier}
          </button>
        </div>
      </div>
    </section>
  )
}
