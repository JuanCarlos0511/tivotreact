import { Play } from 'lucide-react'
import tivotIcon from '../../assets/tivot_icon.png'

interface StartScreenProps {
  onStart: () => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <section className="navigation-screen start-screen">
      <div className="karel-orbit" aria-hidden="true">
        <img className="start-tivot-icon" src={tivotIcon} alt="" />
      </div>
      <h1 className="start-title">TIVOT KAREL</h1>
      <button className="primary-start-button" type="button" onClick={onStart}>
        <Play size={18} />
        <span>Iniciar</span>
      </button>
    </section>
  )
}
