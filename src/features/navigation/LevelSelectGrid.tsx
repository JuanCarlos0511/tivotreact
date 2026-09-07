import { ArrowLeft, Play } from 'lucide-react'
import type { KarelLevel } from '@shared/types'
import { createKarelChallenge, KAREL_LEVELS } from '@shared/catalog'

interface LevelSelectGridProps {
  onBack: () => void
  onSelectLevel: (level: KarelLevel) => void
}

export function LevelSelectGrid({ onBack, onSelectLevel }: LevelSelectGridProps) {
  return (
    <section className="navigation-screen level-select-screen">
      <header className="level-select-header">
        <button className="subtle-nav-button" type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={17} />
        </button>
        <h1>Seleccionar nivel</h1>
      </header>
      <div className="level-grid" aria-label="Niveles de Karel">
        {KAREL_LEVELS.map((level) => (
          <button
            key={level.id}
            className={`level-card level-card-${level.gridPosition}`}
            type="button"
            onClick={() => onSelectLevel(level)}
          >
            <span className="level-card-topline">
              <span className="level-number">Nivel {level.id}</span>
            </span>
            <span className="level-card-title">{level.title.replace(/^Nivel \d+: /, '')}</span>
            <span className="level-card-description">{level.subtitle}</span>
            <span className="level-start-action">
              <Play size={13} />
              Iniciar
            </span>
          </button>
        ))}

        <div className="arena-card" role="region" aria-labelledby="challenge-title">
          <div className="arena-header">
            <h2 className="arena-eyebrow" id="challenge-title">Desafío</h2>
          </div>
          <div className="arena-body">
            <p className="arena-description">
              Enfréntate a mapas dinámicos y pon a prueba tu lógica resolviendo retos de programación con dificultad variable.
            </p>
            <div className="arena-actions">
              <button type="button" className="arena-button primary" onClick={() => onSelectLevel(createKarelChallenge())}>
                <Play size={14} /> Iniciar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
