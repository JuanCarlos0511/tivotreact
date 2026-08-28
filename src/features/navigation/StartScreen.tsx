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
      <h1 className="start-title">TIVOT KAREL</h1>
      <button className="primary-start-button" type="button" onClick={onStart}>
        <Play size={18} />
        <span>Comenzar</span>
      </button>
    </section>
  )
}
