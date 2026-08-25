import { Bot, Play } from 'lucide-react'

interface StartScreenProps {
  onStart: () => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <section className="navigation-screen start-screen">
      <div className="karel-orbit" aria-hidden="true">
        <Bot size={82} strokeWidth={1.7} />
      </div>
      <p className="screen-kicker">Robotica educativa</p>
      <h1 className="start-title">TIVOT KAREL</h1>
      <p className="start-subtitle">
        Aprende logica de programacion guiando a Karel por calles, avenidas, zumbadores y paredes.
      </p>
      <button className="primary-start-button" type="button" onClick={onStart}>
        <Play size={18} />
        <span>Comenzar</span>
      </button>
    </section>
  )
}
