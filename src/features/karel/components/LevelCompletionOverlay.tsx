import { ArrowRight, Home, RotateCcw, Save, X } from 'lucide-react'

const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  left: `${4 + ((index * 37) % 92)}%`,
  delay: `${(index % 7) * 0.08}s`,
  color: ['#10b981', '#fbbf24', '#38bdf8', '#f472b6', '#8b5cf6'][index % 5],
}))

export function LevelCompletionOverlay({ challenge, onPrimary, onSecondary, onClose }: {
  challenge: boolean
  onPrimary: () => void
  onSecondary: () => void
  onClose: () => void
}) {
  return (
    <div className="level-complete-backdrop" role="dialog" aria-modal="true" aria-label="Nivel completado"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="confetti-field" aria-hidden="true">
        {CONFETTI.map((piece, index) => <i key={index} style={{ left: piece.left, animationDelay: piece.delay, backgroundColor: piece.color }} />)}
      </div>
      <div className="level-complete-card">
        <button className="level-complete-close" type="button" onClick={onClose} aria-label="Cerrar victoria"><X size={18} /></button>
        <span className="level-complete-medal" aria-hidden="true">★</span>
        <p>{challenge ? 'DESAFÍO SUPERADO' : 'OBJETIVO CUMPLIDO'}</p>
        <h2>¡Nivel completado!</h2>
        <span className="level-complete-copy">Llegaste a la meta y completaste todas las condiciones.</span>
        <div className="level-complete-actions">
          <button className="complete-action primary" type="button" onClick={onPrimary}>
            {challenge ? <><RotateCcw size={17} /> Jugar nuevo nivel</> : <><ArrowRight size={17} /> Siguiente nivel</>}
          </button>
          <button className="complete-action secondary" type="button" onClick={onSecondary}>
            {challenge ? <><Save size={17} /> Guardar mi partida</> : <><Home size={17} /> Volver al menú</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ChallengeExitDialog({ onCancel, onExit, onSaveAndExit }: {
  onCancel: () => void
  onExit: () => void
  onSaveAndExit: () => void
}) {
  return (
    <div className="level-complete-backdrop exit-confirm-backdrop" role="dialog" aria-modal="true" aria-label="Guardar partida antes de salir">
      <div className="level-complete-card exit-confirm-card">
        <span className="level-complete-medal" aria-hidden="true">🎒</span>
        <p>PARTIDA DE DESAFÍO</p>
        <h2>¿Deseas guardar antes de salir?</h2>
        <span className="level-complete-copy">Se guardarán el mapa, la posición del robot, las fichas y tu código.</span>
        <div className="exit-confirm-actions">
          <button type="button" className="complete-action primary" onClick={onSaveAndExit}><Save size={17} /> Guardar y salir</button>
          <button type="button" className="complete-action danger" onClick={onExit}>Salir sin guardar</button>
          <button type="button" className="complete-action tertiary" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
