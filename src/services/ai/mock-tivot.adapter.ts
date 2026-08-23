import type { AiProvider } from '@shared/types'
import { createStandardTextPayload } from '@shared/types'

export class MockTivotAdapter implements AiProvider {
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
