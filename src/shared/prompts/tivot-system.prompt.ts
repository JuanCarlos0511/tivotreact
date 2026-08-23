import type { TivotConversationContext, TivotInteractiveFlowProblem, TivotProblem } from '@shared/types'

export const TIVOT_SYSTEM_PROMPT = `
Eres Tivot, un tutor amable para ninos que empiezan a aprender algoritmia y programacion muy basica con juegos, robots, recetas, pasos, repeticiones, decisiones y busqueda de errores.

REGLAS DE OPERACION:
1. DOMINIO ESTRICTO: Solo respondes sobre secuencias, algoritmos sencillos, bucles, condicionales y encontrar errores en instrucciones.
2. METODO SOCRATICO: No des soluciones completas de inmediato. Haz preguntas pequenas que ayuden al nino a pensar el siguiente paso.
3. CONCISION EXTREMA: Tu texto explicativo no debe superar 90 palabras cortas.
4. SALIDA OBLIGATORIA EN JSON: Responde unicamente con un objeto JSON valido segun el contrato universal.
5. LENGUAJE INFANTIL: Usa palabras concretas y ludicas. Evita tecnicismos avanzados.
`.trim()

export const buildConversationPrompt = (
  query: string,
  context: TivotConversationContext,
  catalog: TivotProblem[],
): string =>
  [
    TIVOT_SYSTEM_PROMPT,
    '',
    'CONTRATO JSON:',
    payloadContract(),
    '',
    'CATALOGO DISPONIBLE:',
    JSON.stringify(catalogSummary(catalog), null, 2),
    '',
    'CONTEXTO COMPACTO:',
    JSON.stringify(context, null, 2),
    '',
    `MENSAJE DEL USUARIO: ${query}`,
  ].join('\n')

export const buildFlowHintPrompt = (
  problem: TivotInteractiveFlowProblem,
  submittedOrder: string[],
  violatedRule: string,
): string =>
  [
    TIVOT_SYSTEM_PROMPT,
    '',
    'Genera una pista socratica de maximo 80 palabras cortas para un orden incorrecto.',
    'No reveles el orden correcto completo.',
    'Devuelve solo JSON con type="standard_text" e is_evaluation=true.',
    '',
    `PROBLEMA: ${problem.problem_id} - ${problem.title}`,
    `REGLA_INFRINGIDA: ${violatedRule}`,
    `ORDEN_ENVIADO: ${JSON.stringify(submittedOrder)}`,
    '',
    'CONTRATO JSON:',
    payloadContract(),
  ].join('\n')

const payloadContract = (): string =>
  JSON.stringify(
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

const catalogSummary = (catalog: TivotProblem[]): Array<Record<string, unknown>> =>
  catalog.map((problem) => ({
    problem_id: problem.problem_id,
    mode: problem.mode,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: problem.tags,
    system_context: problem.system_context,
  }))
