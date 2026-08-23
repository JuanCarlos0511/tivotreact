import type { TivotConversationContext } from '../dto/tivot-conversation-context.dto'
import type { TivotInteractiveFlowProblem, TivotProblem } from '@domain/entities/tivot-problem.entity'

export const TIVOT_SYSTEM_PROMPT = `
Eres Tivot, un arquitecto de software senior y tutor socratico especializado exclusivamente en logica, algoritmia y sistemas de Punto de Venta (POS).

REGLAS DE OPERACION:
1. DOMINIO ESTRICTO: Solo respondes sobre arquitectura POS, procesamiento transaccional, calculos monetarios, control de stock concurrente y logica de negocio en terminales de venta.
2. METODO SOCRATICO: No des soluciones completas de inmediato. Haz preguntas guia que evidencien fallos de concurrencia, estados inconsistentes o perdida de datos.
3. CONCISION EXTREMA: Tu texto explicativo no debe superar 120 tokens.
4. SALIDA OBLIGATORIA EN JSON: Responde unicamente con un objeto JSON valido segun el contrato universal.
`.trim()

export class TivotPromptBuilderService {
  buildConversationPrompt(query: string, context: TivotConversationContext, catalog: TivotProblem[]): string {
    return [
      TIVOT_SYSTEM_PROMPT,
      '',
      'CONTRATO JSON:',
      this.payloadContract(),
      '',
      'CATALOGO DISPONIBLE:',
      JSON.stringify(this.catalogSummary(catalog), null, 2),
      '',
      'CONTEXTO COMPACTO:',
      JSON.stringify(context, null, 2),
      '',
      `MENSAJE DEL USUARIO: ${query}`,
    ].join('\n')
  }

  buildFlowHintPrompt(
    problem: TivotInteractiveFlowProblem,
    submittedOrder: string[],
    violatedRule: string,
  ): string {
    return [
      TIVOT_SYSTEM_PROMPT,
      '',
      'Genera una pista socratica de maximo 80 tokens para un orden incorrecto.',
      'No reveles el orden correcto completo.',
      'Devuelve solo JSON con type="standard_text" e is_evaluation=true.',
      '',
      `PROBLEMA: ${problem.problem_id} - ${problem.title}`,
      `REGLA_INFRINGIDA: ${violatedRule}`,
      `ORDEN_ENVIADO: ${JSON.stringify(submittedOrder)}`,
      '',
      'CONTRATO JSON:',
      this.payloadContract(),
    ].join('\n')
  }

  private payloadContract(): string {
    return JSON.stringify(
      {
        type: 'standard_text | interactive_flow',
        problem_id: 'string | null',
        message: 'Texto socratico, retroalimentacion o explicacion tecnica',
        flow_data: {
          instruction: 'Consigna breve',
          nodes: [
            { id: 'n1', label: 'Paso A' },
            { id: 'n2', label: 'Paso B' },
            { id: 'n3', label: 'Paso C' },
            { id: 'n4', label: 'Paso D' },
          ],
        },
        metadata: {
          is_evaluation: false,
          passed: null,
          concept: 'Concepto tecnico',
        },
      },
      null,
      2,
    )
  }

  private catalogSummary(catalog: TivotProblem[]): Array<Record<string, unknown>> {
    return catalog.map((problem) => ({
      problem_id: problem.problem_id,
      mode: problem.mode,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      system_context: problem.system_context,
    }))
  }
}
