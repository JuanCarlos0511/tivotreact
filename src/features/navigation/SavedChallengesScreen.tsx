import { ArrowLeft, Pencil, Play, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { SavedChallengeGame } from '@shared/types'

export function SavedChallengesScreen({ games, onBack, onLoad, onRename, onDelete }: {
  games: readonly SavedChallengeGame[]
  onBack: () => void
  onLoad: (game: SavedChallengeGame) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const startEditing = (game: SavedChallengeGame) => {
    setEditingId(game.id)
    setDraftName(game.name)
  }

  const commitEditing = () => {
    if (!editingId || !draftName.trim()) return
    onRename(editingId, draftName)
    setEditingId(null)
  }

  return (
    <section className="navigation-screen saved-games-screen">
      <header className="level-select-header">
        <button className="subtle-nav-button" type="button" onClick={onBack} aria-label="Volver a niveles"><ArrowLeft size={17} /></button>
        <div>
          <span className="workspace-level-badge">Nivel 5</span>
          <h1>Mis partidas guardadas</h1>
        </div>
      </header>
      {games.length === 0 ? (
        <div className="saved-games-empty">
          <span aria-hidden="true">🎒</span>
          <h2>Aún no hay partidas guardadas</h2>
          <p>Entra al desafío y usa “Guardar y salir” para continuar después.</p>
        </div>
      ) : (
        <div className="saved-games-list">
          {games.map((game) => {
            const remaining = game.level.initialWorld.beepers.reduce((total, beeper) => total + beeper.count, 0)
            return (
              <article className="saved-game-card" key={game.id}>
                <div className="saved-game-copy">
                  {editingId === game.id ? (
                    <input autoFocus value={draftName} maxLength={50} aria-label="Nombre de la partida"
                      onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitEditing() }} />
                  ) : <h2>{game.name}</h2>}
                  <p>Robot en ({game.level.initialWorld.karelPosition.street},{game.level.initialWorld.karelPosition.avenue}) · {remaining} fichas pendientes</p>
                  <time dateTime={game.savedAt}>{new Date(game.savedAt).toLocaleString('es-MX')}</time>
                </div>
                <div className="saved-game-actions">
                  <button className="saved-action play" type="button" onClick={() => onLoad(game)}><Play size={15} /> Continuar</button>
                  {editingId === game.id ? (
                    <button className="saved-action" type="button" onClick={commitEditing}><Save size={15} /> Guardar nombre</button>
                  ) : (
                    <button className="saved-action" type="button" onClick={() => startEditing(game)}><Pencil size={15} /> Editar</button>
                  )}
                  <button className="saved-action delete" type="button" onClick={() => onDelete(game.id)}><Trash2 size={15} /> Eliminar</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
