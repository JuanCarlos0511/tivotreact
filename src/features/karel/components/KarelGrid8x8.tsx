import { ArrowUp, Bot } from 'lucide-react'
import type { KarelWorldState } from '@shared/types'

interface KarelGrid8x8Props {
  isRunning?: boolean
  hasError?: boolean
  wallCollision?: boolean
  world: KarelWorldState
}

const STREETS = [8, 7, 6, 5, 4, 3, 2, 1] as const
const AVENUES = [1, 2, 3, 4, 5, 6, 7, 8] as const

const DIRECTION_ANGLE = { NORTE: 0, ESTE: 90, SUR: 180, OESTE: 270 } as const
const LABELS = { NORTE: 'Norte', ESTE: 'Este', SUR: 'Sur', OESTE: 'Oeste' }

export function KarelGrid8x8({ world, isRunning = false, hasError = false, wallCollision = false }: KarelGrid8x8Props) {
  const getBeeper = (street: number, avenue: number) =>
    world.beepers.find((beeper) => beeper.street === street && beeper.avenue === avenue)

  return (
    <section className="karel-board-panel" aria-label="Mundo de Karel 8 por 8">
      <div className="karel-board-meta">
        <span>Mundo 8x8</span>
        <span className="karel-compass" aria-label={`Orientación: ${LABELS[world.karelDirection]}`}>
          <ArrowUp size={14} style={{ transform: `rotate(${DIRECTION_ANGLE[world.karelDirection]}deg)` }} />
          {LABELS[world.karelDirection]}
        </span>
      </div>
      <div className="karel-board-shell">
        <div className="karel-street-labels" aria-hidden="true">
          {STREETS.map((street) => (
            <span key={street}>{street}</span>
          ))}
        </div>
        <div className={`karel-grid ${wallCollision ? 'karel-wall-error' : ''}`}>
          {STREETS.map((street) =>
            AVENUES.map((avenue) => {
              const hasKarel = world.karelPosition.street === street && world.karelPosition.avenue === avenue
              const beeper = getBeeper(street, avenue)

              return (
                <div key={`${street}-${avenue}`} className="karel-cell">
                  {beeper && <span className="beeper-badge">{beeper.count}</span>}
                  {hasKarel && (
                    <span className={`karel-token ${isRunning ? 'karel-pulsing' : ''} ${hasError ? 'karel-error' : ''}`} aria-label={`Karel en calle ${world.karelPosition.street}, avenida ${world.karelPosition.avenue}, orientado al ${world.karelDirection}`}>
                      <Bot size={17} />
                      <span className="karel-direction" style={{ transform: `rotate(${DIRECTION_ANGLE[world.karelDirection]}deg)` }}><i /></span>
                    </span>
                  )}
                </div>
              )
            }),
          )}
        </div>
        <div className="karel-avenue-labels" aria-hidden="true">
          {AVENUES.map((avenue) => (
            <span key={avenue}>{avenue}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
