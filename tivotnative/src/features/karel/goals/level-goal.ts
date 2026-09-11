import type { KarelLevel, KarelWorldPoint, KarelWorldState } from '../../../shared/types'
import type { ExecutionStep } from '../hooks/use-karel-runner'

const samePoint = (left: KarelWorldPoint, right: KarelWorldPoint) =>
  left.street === right.street && left.avenue === right.avenue

export const getTotalLevelBeepers = (level: KarelLevel) =>
  level.initialWorld.bagBeepers + level.initialWorld.beepers.reduce((total, beeper) => total + beeper.count, 0)

export const isLevelGoalComplete = (
  level: KarelLevel,
  world: KarelWorldState,
  steps: readonly ExecutionStep[],
) => {
  if (!samePoint(world.karelPosition, level.goal.position)) return false
  if (level.goal.direction && world.karelDirection !== level.goal.direction) return false
  if (level.goal.requireAllBeepers && world.beepers.some((beeper) => beeper.count > 0)) return false

  const visited = [level.initialWorld.karelPosition, ...steps.map((step) => step.worldSnapshot.karelPosition)]
  return (level.goal.requiredVisits ?? []).every((point) => visited.some((position) => samePoint(position, point)))
}

export const describeMissingGoal = (level: KarelLevel, world: KarelWorldState) => {
  if (level.goal.requireAllBeepers && world.beepers.some((beeper) => beeper.count > 0)) {
    return 'El programa terminó, pero todavía quedan fichas por recoger.'
  }
  if (!samePoint(world.karelPosition, level.goal.position)) {
    return `El programa terminó. Lleva al robot a la meta (${level.goal.position.street},${level.goal.position.avenue}).`
  }
  return 'Llegaste a la meta, pero todavía falta completar el recorrido indicado.'
}
