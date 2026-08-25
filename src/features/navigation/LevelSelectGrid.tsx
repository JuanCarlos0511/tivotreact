import { ArrowLeft, CheckCircle2, Map } from 'lucide-react'
import type { KarelLevel } from '@shared/types'
import { KAREL_LEVELS } from '@shared/catalog'

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
        <div>
          <p className="screen-kicker">Mapas de aprendizaje</p>
          <h1>Selecciona un Mapa</h1>
        </div>
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
              <CheckCircle2 size={15} />
            </span>
            <span className="level-card-title">{level.title.replace(/^Nivel \d+: /, '')}</span>
            <span className="level-card-description">{level.description}</span>
            <span className="level-command-list">
              {level.commands.map((command) => (
                <span key={command} className="level-command-chip">
                  {command}
                </span>
              ))}
            </span>
            <span className="level-status-badge">
              <Map size={13} />
              Disponible
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
