import { RotateCcw, Send, Terminal } from 'lucide-react'
import { useRef } from 'react'

interface KarelCodeEditorProps {
  code: string
  onChange: (code: string) => void
  onCompile: () => void
  onRun: () => void
  onReset: () => void
}

const QUICK_COMMANDS = ['avanza;', 'gira-izquierda;', 'coge-zumbador;', 'deja-zumbador;', 'apagate;'] as const

export function KarelCodeEditor({ code, onChange, onCompile, onRun, onReset }: KarelCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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
      <textarea
        ref={textareaRef}
        className="karel-code-textarea"
        value={code}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        rows={11}
      />
      <div className="karel-editor-actions">
        <button className="editor-secondary-button" type="button" onClick={onCompile}>
          Compilar
        </button>
        <button className="editor-run-button" type="button" onClick={onRun}>
          <Send size={15} />
          Ejecutar
        </button>
      </div>
    </section>
  )
}
