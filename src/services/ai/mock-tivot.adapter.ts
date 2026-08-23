import type { AiProvider } from '@shared/types'
import { createStandardTextPayload } from '@shared/types'

export class MockTivotAdapter implements AiProvider {
  async complete(prompt: string): Promise<string> {
    const isEvaluation = prompt.includes('ORDEN_ENVIADO')

    const payload = createStandardTextPayload(
      isEvaluation
        ? 'Mira el camino como si fueras el robot: que paso deberia pasar justo antes de este?'
        : 'Vamos con una mision pequena: dime los pasos como si el robot solo pudiera obedecer una instruccion a la vez.',
      {
        is_evaluation: isEvaluation,
        passed: isEvaluation ? false : null,
        concept: isEvaluation ? 'Orden de pasos' : 'Algoritmos',
      },
    )

    return JSON.stringify(payload)
  }
}
