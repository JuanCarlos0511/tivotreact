import AsyncStorage from '@react-native-async-storage/async-storage'
import type { KarelLevel, KarelWorldState, SavedChallengeGame } from '../../../shared/types'

const STORAGE_KEY = '@tivot/saved-challenges/v1'

const keepOneBeeperPerCell = (world: KarelWorldState): KarelWorldState => {
  const occupied = new Set<string>()
  return {
    ...world,
    karelPosition: { ...world.karelPosition },
    beepers: world.beepers.flatMap(beeper => {
      const key = `${beeper.street}:${beeper.avenue}`
      if (beeper.count < 1 || occupied.has(key)) return []
      occupied.add(key)
      return [{ ...beeper, count: 1 }]
    }),
  }
}

const normalizeSavedGame = (game: SavedChallengeGame): SavedChallengeGame => ({
  ...game,
  level: { ...game.level, initialWorld: keepOneBeeperPerCell(game.level.initialWorld) },
})

export const loadSavedChallenges = async (): Promise<SavedChallengeGame[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SavedChallengeGame[]).map(normalizeSavedGame) : []
  } catch {
    return []
  }
}

const writeGames = async (games: SavedChallengeGame[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export const saveChallenge = async (level: KarelLevel, world: KarelWorldState, code: string) => {
  const games = await loadSavedChallenges()
  const now = new Date()
  const id = level.savedGameId ?? `challenge-${now.getTime()}`
  const previous = games.find((game) => game.id === id)
  const name = level.savedGameName ?? previous?.name ?? `Desafío ${now.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
  const savedLevel: KarelLevel = {
    ...level,
    savedGameId: id,
    savedGameName: name,
    initialWorld: keepOneBeeperPerCell(world),
    starterCode: code,
  }
  const game: SavedChallengeGame = { id, name, savedAt: now.toISOString(), level: savedLevel }
  await writeGames([game, ...games.filter((item) => item.id !== id)])
  return game
}

export const renameSavedChallenge = async (id: string, name: string) => {
  const cleanName = name.trim()
  const current = await loadSavedChallenges()
  if (!cleanName) return current
  const games = current.map((game) => game.id === id
    ? { ...game, name: cleanName, level: { ...game.level, savedGameName: cleanName } }
    : game)
  await writeGames(games)
  return games
}

export const deleteSavedChallenge = async (id: string) => {
  const games = (await loadSavedChallenges()).filter((game) => game.id !== id)
  await writeGames(games)
  return games
}
