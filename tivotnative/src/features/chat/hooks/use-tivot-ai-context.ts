import { useMemo } from 'react'
import type {
  KarelDirection,
  KarelLevel,
  KarelWorldState,
  TivotAiContext,
  TivotExecutionSnapshot,
} from '../../../shared/types'

const FRIENDLY_DIRECTIONS: Record<KarelDirection, TivotAiContext['robot']['direction']> = {
  NORTE: 'arriba',
  SUR: 'abajo',
  ESTE: 'derecha',
  OESTE: 'izquierda',
}

interface UseTivotAiContextInput {
  level: KarelLevel
  world: KarelWorldState
  code: string
  lastExecution: TivotExecutionSnapshot
}

export const useTivotAiContext = ({
  level,
  world,
  code,
  lastExecution,
}: UseTivotAiContextInput): TivotAiContext =>
  useMemo(
    () => ({
      level: {
        id: level.id,
        title: level.title,
        objective: level.objective,
      },
      robot: {
        street: world.karelPosition.street,
        avenue: world.karelPosition.avenue,
        direction: FRIENDLY_DIRECTIONS[world.karelDirection],
      },
      board: {
        rows: 8,
        columns: 8,
        beepers: world.beepers.map(beeper => ({ ...beeper })),
      },
      bagBeepers: world.bagBeepers,
      codeLines: code.split('\n'),
      lastExecution,
    }),
    [code, lastExecution, level.id, level.objective, level.title, world],
  )
