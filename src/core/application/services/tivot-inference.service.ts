import type { AiProviderPort } from '@domain/ports/ai-provider.port'
import type { TivotInteractiveFlowProblem, TivotProblem } from '@domain/entities/tivot-problem.entity'
import type { TivotAssistantPayload } from '@domain/value-objects/tivot-payload.vo'
import type { TivotConversationContext } from '../dto/tivot-conversation-context.dto'
import { createStandardTextPayload } from '@domain/value-objects/tivot-payload.vo'
import type { TivotJsonParserService } from './tivot-json-parser.service'
import type { TivotPromptBuilderService } from './tivot-prompt-builder.service'

export interface TivotInferenceResult {
  payload: TivotAssistantPayload
  rawAnswer: string | null
  llmInvoked: boolean
}

export class TivotInferenceService {
  constructor(
    private readonly aiProvider: AiProviderPort,
    private readonly parser: TivotJsonParserService,
    private readonly promptBuilder: TivotPromptBuilderService,
  ) {}

  async answerConversation(
    query: string,
    context: TivotConversationContext,
    catalog: TivotProblem[],
  ): Promise<TivotInferenceResult> {
    const fallbackPayload = createStandardTextPayload(
      'Llevemoslo a POS: que dato queda inconsistente si esa operacion se repite, falla a medias o se cruza con otra caja?',
      {
        is_evaluation: false,
        passed: null,
        concept: 'Arquitectura POS',
      },
    )

    return this.completeWithFallback(
      this.promptBuilder.buildConversationPrompt(query, context, catalog),
      fallbackPayload,
    )
  }

  async answerFlowFailure(
    problem: TivotInteractiveFlowProblem,
    submittedOrder: string[],
    violatedRule: string,
    fallbackPayload: TivotAssistantPayload,
  ): Promise<TivotInferenceResult> {
    return this.completeWithFallback(
      this.promptBuilder.buildFlowHintPrompt(problem, submittedOrder, violatedRule),
      fallbackPayload,
    )
  }

  private async completeWithFallback(prompt: string, fallbackPayload: TivotAssistantPayload): Promise<TivotInferenceResult> {
    try {
      const rawAnswer = await this.aiProvider.complete(prompt)
      const parsedPayload = this.parser.parse(rawAnswer)

      return {
        payload: parsedPayload ?? fallbackPayload,
        rawAnswer,
        llmInvoked: true,
      }
    } catch {
      return {
        payload: fallbackPayload,
        rawAnswer: null,
        llmInvoked: false,
      }
    }
  }
}
