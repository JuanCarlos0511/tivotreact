import type { KarelLevel } from '@shared/types'

export const createCompleteLevelSolution = (level: KarelLevel): string[] => {
  type Direction = KarelLevel['initialWorld']['karelDirection']
  const leftTurnOrder: Direction[] = ['NORTE', 'OESTE', 'SUR', 'ESTE']
  const code = ['iniciar-programa']
  const position = { ...level.initialWorld.karelPosition }
  let direction = level.initialWorld.karelDirection
  const remainingBeepers = new Map(
    level.initialWorld.beepers.map(beeper => [`${beeper.street}:${beeper.avenue}`, beeper.count]),
  )

  const collectHere = () => {
    if (!level.goal.requireAllBeepers) return
    const key = `${position.street}:${position.avenue}`
    const count = remainingBeepers.get(key) ?? 0
    for (let index = 0; index < count; index += 1) code.push('  coge-ficha;')
    remainingBeepers.delete(key)
  }
  const face = (nextDirection: Direction) => {
    const turns = (leftTurnOrder.indexOf(nextDirection) - leftTurnOrder.indexOf(direction) + 4) % 4
    for (let index = 0; index < turns; index += 1) code.push('  gira-izquierda;')
    direction = nextDirection
  }
  const advance = (nextDirection: Direction, distance: number) => {
    face(nextDirection)
    for (let index = 0; index < distance; index += 1) {
      code.push('  avanza;')
      if (nextDirection === 'NORTE') position.street += 1
      else if (nextDirection === 'SUR') position.street -= 1
      else if (nextDirection === 'ESTE') position.avenue += 1
      else position.avenue -= 1
      collectHere()
    }
  }
  const moveTo = (target: KarelLevel['goal']['position']) => {
    const streetDistance = target.street - position.street
    if (streetDistance !== 0) advance(streetDistance > 0 ? 'NORTE' : 'SUR', Math.abs(streetDistance))
    const avenueDistance = target.avenue - position.avenue
    if (avenueDistance !== 0) advance(avenueDistance > 0 ? 'ESTE' : 'OESTE', Math.abs(avenueDistance))
  }

  collectHere()
  level.goal.requiredVisits?.forEach(moveTo)
  if (level.goal.requireAllBeepers) {
    level.initialWorld.beepers.forEach(beeper => {
      if (remainingBeepers.has(`${beeper.street}:${beeper.avenue}`)) moveTo(beeper)
    })
  }
  moveTo(level.goal.position)
  if (level.goal.direction) face(level.goal.direction)
  code.push('finalizar-programa')
  return code
}
