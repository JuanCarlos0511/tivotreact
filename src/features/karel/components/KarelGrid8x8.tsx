import { Bot } from 'lucide-react'
import type { KarelWorldState } from '@shared/types'

interface KarelGrid8x8Props {
  world: KarelWorldState
}

const STREETS = [8, 7, 6, 5, 4, 3, 2, 1] as const
const AVENUES = [1, 2, 3, 4, 5, 6, 7, 8] as const

const DIRECTION_SYMBOL = {
  NORTE: '▲',
  SUR: '▼',
  ESTE: '►',
  OESTE: '◄',
} as const

export function KarelGrid8x8({ world }: KarelGrid8x8Props) {
  const getBeeper = (street: number, avenue: number) =>
    world.beepers.find((beeper) => beeper.street === street && beeper.avenue === avenue)

  return (
    <section className="karel-board-panel" aria-label="Mundo de Karel 8 por 8">
      <div className="karel-board-meta">
        <span>Mundo 8x8</span>
        <span>Mochila: {world.bagBeepers}</span>
      </div>
      <div className="karel-board-shell">
        <div className="karel-street-labels" aria-hidden="true">
          {STREETS.map((street) => (
            <span key={street}>{street}</span>
          ))}
        </div>
        <div className="karel-grid">
          {STREETS.map((street) =>
            AVENUES.map((avenue) => {
              const hasKarel = world.karelPosition.street === street && world.karelPosition.avenue === avenue
              const beeper = getBeeper(street, avenue)

              return (
                <div key={`${street}-${avenue}`} className="karel-cell">
                  {beeper && <span className="beeper-badge">{beeper.count}</span>}
                  {hasKarel && (
                    <span className="karel-token" aria-label={`Karel orientado al ${world.karelDirection}`}>
                      <Bot size={17} />
                      <span>{DIRECTION_SYMBOL[world.karelDirection]}</span>
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
