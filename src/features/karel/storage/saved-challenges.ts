import type { KarelLevel, KarelWorldState, SavedChallengeGame } from '@shared/types'

const STORAGE_KEY = 'tivot.saved-challenges.v1'

const readGames = (): SavedChallengeGame[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed as SavedChallengeGame[] : []
  } catch {
    return []
  }
}

const writeGames = (games: SavedChallengeGame[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export const loadSavedChallenges = () => readGames()

export const saveChallenge = (level: KarelLevel, world: KarelWorldState, code: string) => {
  const games = readGames()
  const now = new Date()
  const id = level.savedGameId ?? `challenge-${now.getTime()}`
  const previous = games.find((game) => game.id === id)
  const name = level.savedGameName ?? previous?.name ?? `Desafío ${now.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
  const savedLevel: KarelLevel = {
    ...level,
    savedGameId: id,
    savedGameName: name,
    initialWorld: {
      karelPosition: { ...world.karelPosition },
      karelDirection: world.karelDirection,
      beepers: world.beepers.map((beeper) => ({ ...beeper })),
      bagBeepers: world.bagBeepers,
    },
    starterCode: code,
  }
  const game: SavedChallengeGame = { id, name, savedAt: now.toISOString(), level: savedLevel }
  writeGames([game, ...games.filter((item) => item.id !== id)])
  return game
}

export const renameSavedChallenge = (id: string, name: string) => {
  const cleanName = name.trim()
  if (!cleanName) return readGames()
  const games = readGames().map((game) => game.id === id
    ? { ...game, name: cleanName, level: { ...game.level, savedGameName: cleanName } }
    : game)
  writeGames(games)
  return games
}

export const deleteSavedChallenge = (id: string) => {
  const games = readGames().filter((game) => game.id !== id)
  writeGames(games)
  return games
}
