import type { TivotProblem } from '@domain/entities/tivot-problem.entity'
import type { PosQueryRequest } from '../dto/pos-query-request.dto'
import type { PosQueryResponse } from '../dto/pos-query-response.dto'
import { TIVOT_PROBLEM_CATALOG } from '@shared/catalog/tivot-problems.catalog'
import { createStandardTextPayload } from '@domain/value-objects/tivot-payload.vo'
import type { TivotContextWindowService } from '../services/tivot-context-window.service'
import type { TivotInferenceService } from '../services/tivot-inference.service'
import type { TivotProblemEvaluatorService } from '../services/tivot-problem-evaluator.service'

export class ProcessPosUserQueryUseCase {
  constructor(
    private readonly inference: TivotInferenceService,
    private readonly evaluator: TivotProblemEvaluatorService,
    private readonly contextWindow: TivotContextWindowService,
    private readonly catalog: TivotProblem[] = TIVOT_PROBLEM_CATALOG,
  ) {}

  async execute(request: PosQueryRequest): Promise<PosQueryResponse> {
    const result = await this.resolvePayload(request)
    const context = this.contextWindow.appendTurn(request.context, request.userPayload, result.payload)

    return {
      ...result,
      context,
    }
  }

  private async resolvePayload(
    request: PosQueryRequest,
  ): Promise<Omit<PosQueryResponse, 'context'>> {
    if (request.userPayload.user_action === 'submit_flow_order') {
      const evaluation = this.evaluator.evaluateFlowOrder(
        request.userPayload.problem_id,
        request.userPayload.submitted_order,
        this.catalog,
      )

      if (!evaluation) {
        return {
          payload: createStandardTextPayload(
            'No encuentro ese problema activo. Elige un flujo del catalogo y revisamos el orden desde ahi.',
            {
              is_evaluation: true,
              passed: false,
              concept: 'Catalogo POS',
            },
          ),
          rawAnswer: null,
          algorithmUsed: true,
          llmInvoked: false,
        }
      }

      if (evaluation.passed) {
        return {
          payload: evaluation.fallbackPayload,
          rawAnswer: null,
          algorithmUsed: true,
          llmInvoked: false,
        }
      }

      const inferenceResult = await this.inference.answerFlowFailure(
        evaluation.problem,
        request.userPayload.submitted_order,
        evaluation.violatedRule,
        evaluation.fallbackPayload,
      )

      return {
        ...inferenceResult,
        algorithmUsed: true,
      }
    }

    const inferenceResult = await this.inference.answerConversation(
      request.userPayload.message,
      request.context,
      this.catalog,
    )

    return {
      ...inferenceResult,
      algorithmUsed: false,
    }
  }
}
