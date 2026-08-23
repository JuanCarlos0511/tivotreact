import type { AiProviderPort } from '@domain/ports/ai-provider.port'
import { createStandardTextPayload } from '@domain/value-objects/tivot-payload.vo'

export class MockTivotAiAdapter implements AiProviderPort {
  async complete(prompt: string): Promise<string> {
    const isEvaluation = prompt.includes('ORDEN_ENVIADO')

    const payload = createStandardTextPayload(
      isEvaluation
        ? 'Antes de confirmar, que recurso compartido queda sin proteger si inviertes esos pasos?'
        : 'Piensa en el invariante POS: dinero, ticket y stock deben cambiar juntos. Cual de esos tres podria quedar duplicado o atrasado?',
      {
        is_evaluation: isEvaluation,
        passed: isEvaluation ? false : null,
        concept: isEvaluation ? 'ACID' : 'Arquitectura POS',
      },
    )

    return JSON.stringify(payload)
  }
}
