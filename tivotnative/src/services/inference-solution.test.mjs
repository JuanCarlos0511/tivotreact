import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KAREL_LEVELS } from '../shared/catalog/karel-levels.catalog.ts'
import { buildExecution } from '../features/karel/hooks/use-karel-runner.ts'
import { isLevelGoalComplete } from '../features/karel/goals/level-goal.ts'
import { createCompleteLevelSolution } from './direct-level-solution.ts'

test('the local direct answer completes every built-in level', () => {
  for (const level of KAREL_LEVELS) {
    const code = createCompleteLevelSolution(level).join('\n')
    const execution = buildExecution(code, level.initialWorld)
    const finalWorld = execution.steps.at(-1)?.worldSnapshot

    assert.equal(execution.result.success, true, `level ${level.id} should compile`)
    assert.equal(execution.steps.some(step => step.error), false, `level ${level.id} should run without errors`)
    assert.ok(finalWorld, `level ${level.id} should produce a final world`)
    assert.equal(isLevelGoalComplete(level, finalWorld, execution.steps), true, `level ${level.id} should complete its goal`)
  }
})
