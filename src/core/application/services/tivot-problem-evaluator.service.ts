import type { TivotInteractiveFlowProblem, TivotProblem } from '@domain/entities/tivot-problem.entity'
import { isInteractiveFlowProblem } from '@domain/entities/tivot-problem.entity'
import { createStandardTextPayload, type TivotStandardTextPayload } from '@domain/value-objects/tivot-payload.vo'

interface FailedFlowEvaluation {
  passed: false
  problem: TivotInteractiveFlowProblem
  violatedRule: string
  fallbackPayload: TivotStandardTextPayload
}

interface PassedFlowEvaluation {
  passed: true
  problem: TivotInteractiveFlowProblem
  fallbackPayload: TivotStandardTextPayload
}

export type FlowEvaluationResult = FailedFlowEvaluation | PassedFlowEvaluation

export class TivotProblemEvaluatorService {
  evaluateFlowOrder(
    problemId: string,
    submittedOrder: string[],
    catalog: TivotProblem[],
  ): FlowEvaluationResult | null {
    const problem = catalog.find(
      (candidate): candidate is TivotInteractiveFlowProblem =>
        candidate.problem_id === problemId && isInteractiveFlowProblem(candidate),
    )

    if (!problem) return null

    const passed = problem.flow_definition.valid_orders.some((validOrder) =>
      this.sameOrder(validOrder, submittedOrder),
    )

    if (passed) {
      return {
        passed: true,
        problem,
        fallbackPayload: this.createPassedPayload(problem),
      }
    }

    const failure = this.findFailureHint(problem, submittedOrder)

    return {
      passed: false,
      problem,
      violatedRule: failure.violatedRule,
      fallbackPayload: this.createFailedPayload(problem, failure.hint),
    }
  }

  private sameOrder(validOrder: string[], submittedOrder: string[]): boolean {
    return validOrder.length === submittedOrder.length && validOrder.every((nodeId, index) => nodeId === submittedOrder[index])
  }

  private findFailureHint(
    problem: TivotInteractiveFlowProblem,
    submittedOrder: string[],
  ): { violatedRule: string; hint: string } {
    for (const [rule, hint] of Object.entries(problem.failure_hints)) {
      const parsedRule = rule.match(/^(.+)_before_(.+)$/)
      const beforeNode = parsedRule?.[1]
      const afterNode = parsedRule?.[2]
      if (!beforeNode || !afterNode) continue

      const beforeIndex = submittedOrder.indexOf(beforeNode)
      const afterIndex = submittedOrder.indexOf(afterNode)
      if (beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex) {
        return { violatedRule: rule, hint }
      }
    }

    const firstValidOrder = problem.flow_definition.valid_orders[0] ?? problem.flow_definition.nodes.map((node) => node.id)
    const firstMismatchIndex = firstValidOrder.findIndex((nodeId, index) => submittedOrder[index] !== nodeId)
    const violatedRule = firstMismatchIndex >= 0 ? `expected_${firstValidOrder[firstMismatchIndex]}_at_${firstMismatchIndex + 1}` : 'unknown_order'

    return {
      violatedRule,
      hint: 'Que estado queda comprometido si confirmas un paso irreversible antes de reservar o validar la operacion anterior?',
    }
  }

  private createPassedPayload(problem: TivotInteractiveFlowProblem): TivotStandardTextPayload {
    return createStandardTextPayload(
      'Correcto. La secuencia conserva la atomicidad: primero protege el recurso, luego valida el cobro y al final confirma los efectos permanentes.',
      {
        is_evaluation: true,
        passed: true,
        concept: problem.tags[0] ?? 'Arquitectura POS',
      },
      problem.problem_id,
    )
  }

  private createFailedPayload(problem: TivotInteractiveFlowProblem, hint: string): TivotStandardTextPayload {
    return createStandardTextPayload(
      hint,
      {
        is_evaluation: true,
        passed: false,
        concept: problem.tags[0] ?? 'Arquitectura POS',
      },
      problem.problem_id,
    )
  }
}
