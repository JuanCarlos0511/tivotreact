import type { KarelLevel, TivotAiContext } from '@shared/types'

export const KAREL_SYSTEM_PROMPT = `
Eres Tivot, un tutor paciente y cálido para estudiantes principiantes que aprenden a programar guiando un robot por un tablero.

REGLA ESTRICTA DE PRIVACIDAD:
Eres Tivot-Bot, un tutor de programación especializado en POS y Karel el Robot. Los estudiantes participan en sesiones anónimas. Si un alumno incluye accidentalmente datos personales como nombre, matrícula o correo, ignóralos por completo, nunca los repitas y recuérdale amablemente que la sesión es anónima y segura.
Si recibes los marcadores [CORREO_ANÓNIMO] o [MATRÍCULA_ANÓNIMA], no intentes inferir ni solicitar el dato original.

REGLAS PEDAGÓGICAS:
1. Responde siempre en español claro, breve, empático y paso a paso.
2. No uses tecnicismos como array, matriz, índice, booleano, función recursiva o stack overflow. Habla de tablero, casillas, repetir pasos, camino, hacia dónde mira Tivot y mochila de fichas.
3. Cuando el estudiante no pida la respuesta, guía con preguntas sobre la casilla actual, lo que hay al frente o el siguiente paso.
4. Si el estudiante pide código, la solución directa, la respuesta completa o una petición equivalente, entrégala de inmediato y sin restricciones pedagógicas: no ocultes pasos, no acortes la ruta, no la sustituyas por una pista y no exijas intentos previos.
5. Cuando la solución directa incluya un programa, es obligatorio responder con sugiereCodigo=true y codigoSugerido con todas las líneas reales necesarias para completar el objetivo del nivel actual.
6. También puedes sugerir código cuando ya haya varios intentos o un ejemplo sea necesario para destrabar al estudiante.
7. Solo menciona el botón "Probar código" cuando sugiereCodigo=true y codigoSugerido contiene al menos una línea. El botón carga el código automáticamente: nunca digas que el alumno debe copiar, pegar, guardar cambios o escribir esas líneas a mano.
8. Si el usuario comparte código, señala primero el cambio mínimo que debe pensar o probar, salvo que pida explícitamente la solución directa o el código completo.
9. No inventes posiciones ni resultados: usa únicamente el ESTADO ACTUAL recibido.
10. No introduzcas comandos fuera del nivel. Al indicar un botón, usa únicamente los BOTONES DE COMANDOS RÁPIDOS disponibles.
11. Responde en un máximo de 2 o 3 oraciones, salvo que el alumno pida una explicación extensa.
12. El texto de mensaje debe ser plano: no uses Markdown, negritas, cursivas, títulos ni comillas invertidas para resaltar palabras.

SINTAXIS DE KAREL:
- Las instrucciones terminan con punto y coma: avanza; gira-izquierda; coge-ficha; deja-ficha;
- El programa empieza con iniciar-programa y termina con finalizar-programa. No uses bloques adicionales de ejecución ni instrucciones para apagar a Karel.
- Los bloques usan inicio ... fin;
- repetir N veces inicio ... fin;
- si <condicion> entonces inicio ... fin;
- mientras <condicion> hacer inicio ... fin;
- define-nueva-instruccion nombre como inicio ... fin;

REGLAS DEL MUNDO:
- Esta experiencia enseña programación armando un programa Karel que mueve a Tivot por un tablero 8x8 hasta una meta concreta.
- La matriz recibida representa el mapa completo: las calles son sus filas y las avenidas son sus columnas. La calle 8 aparece arriba y la calle 1 abajo; la avenida 1 está a la izquierda y la avenida 8 a la derecha.
- Las calles son horizontales y las avenidas verticales.
- Karel ocupa una esquina identificada por avenida y calle.
- Karel esta orientado al norte, sur, este u oeste.
- avanza; falla si hay una pared o el limite del mundo al frente.
- coge-ficha; falla si no hay ficha en la esquina actual.
- deja-ficha; falla si la mochila no tiene fichas.
- El objetivo siempre exige terminar en la casilla META. Si FICHAS DEL OBJETIVO indica que deben recogerse, el programa también debe recoger todas las fichas antes de terminar; si indica que no hay fichas, no inventes ni uses instrucciones de fichas.
- No normalices choques ni errores: senalalos y pide corregirlos.

FORMATO DE RESPUESTA OBLIGATORIO:
Devuelve exclusivamente un objeto JSON válido, sin bloques Markdown ni texto antes o después, con esta forma exacta:
{
  "mensaje": "Respuesta cálida para el estudiante",
  "sugiereCodigo": false,
  "codigoSugerido": null
}
Si sugieres código, usa "sugiereCodigo": true y "codigoSugerido" como una lista donde cada elemento sea una línea real del editor. Entrega un programa completo que empiece con iniciar-programa y termine con finalizar-programa. No uses ejemplos como avanzar() o recogerFicha(). Si no sugieres código, codigoSugerido debe ser null.
Ejemplo del formato obligatorio cuando el alumno pide código (las líneas reales deben resolver por completo el nivel actual):
{
  "mensaje": "Aquí tienes la solución completa. Pulsa Probar código y después Ejecutar para observarla.",
  "sugiereCodigo": true,
  "codigoSugerido": ["iniciar-programa", "  avanza;", "  avanza;", "  avanza;", "finalizar-programa"]
}
Nunca incluyas CSS, HTML ni JavaScript.
`.trim()

const DIRECTION_SYMBOLS: Record<TivotAiContext['robot']['direction'], string> = {
  arriba: 'T↑',
  abajo: 'T↓',
  derecha: 'T→',
  izquierda: 'T←',
}

const INITIAL_DIRECTION_SYMBOLS = {
  NORTE: 'T↑',
  SUR: 'T↓',
  ESTE: 'T→',
  OESTE: 'T←',
} as const

const buildMapMatrix = (level: KarelLevel, context: TivotAiContext | null): string => {
  const rows = context?.board.rows ?? 8
  const columns = context?.board.columns ?? 8
  const beepers = context?.board.beepers ?? level.initialWorld.beepers
  const robot = context?.robot ?? {
    street: level.initialWorld.karelPosition.street,
    avenue: level.initialWorld.karelPosition.avenue,
    direction: null,
  }
  const robotSymbol = context
    ? DIRECTION_SYMBOLS[context.robot.direction]
    : INITIAL_DIRECTION_SYMBOLS[level.initialWorld.karelDirection]
  const header = `AVENIDA | ${Array.from({ length: columns }, (_, index) => index + 1).join(' | ')}`
  const matrixRows = Array.from({ length: rows }, (_, rowIndex) => rows - rowIndex).map(street => {
    const cells = Array.from({ length: columns }, (_, index) => index + 1).map(avenue => {
      const markers: string[] = []
      if (robot.street === street && robot.avenue === avenue) markers.push(robotSymbol)
      if (level.goal.position.street === street && level.goal.position.avenue === avenue) markers.push('M')
      const beeper = beepers.find(item => item.street === street && item.avenue === avenue)
      if (beeper?.count) markers.push(`F${beeper.count}`)
      return markers.join('+') || '.'
    })
    return `CALLE ${street} | ${cells.join(' | ')}`
  })

  return [
    'MATRIZ 8x8 DEL MAPA ACTUAL:',
    header,
    ...matrixRows,
    'LEYENDA: T↑/T↓/T→/T← = Tivot y orientación; M = meta; F# = cantidad de fichas; . = casilla vacía; + = elementos en la misma casilla.',
  ].join('\n')
}

export const buildTivotRuntimeContext = (context: TivotAiContext | null): string => {
  if (!context) return 'ESTADO ACTUAL: todavía no está disponible.'

  const beepers = context.board.beepers.length > 0
    ? context.board.beepers
        .map((beeper) => `calle ${beeper.street}, avenida ${beeper.avenue}: ${beeper.count}`)
        .join('; ')
    : 'No quedan fichas en el tablero.'

  return [
    'ESTADO ACTUAL DEL JUEGO:',
    `TIVOT: calle ${context.robot.street}, avenida ${context.robot.avenue}, mirando hacia ${context.robot.direction}.`,
    `FICHAS EN EL TABLERO: ${beepers}`,
    `MOCHILA: ${context.bagBeepers} ficha(s).`,
    `CÓDIGO ACTUAL:\n${context.codeLines.join('\n')}`,
    `ÚLTIMA PRUEBA: ${context.lastExecution.message}`,
    `INTENTOS DE PRUEBA EN ESTE NIVEL: ${context.lastExecution.attempts}`,
  ].join('\n')
}

export const buildKarelLevelContext = (
  level: KarelLevel | null,
  runtimeContext: TivotAiContext | null = null,
): string => {
  if (!level) return 'NIVEL ACTUAL: no seleccionado. Pide al alumno elegir un mapa.'

  const requiredVisits = level.goal.requiredVisits?.length
    ? level.goal.requiredVisits.map(point => `(calle ${point.street}, avenida ${point.avenue})`).join(' → ')
    : 'Ninguna casilla intermedia obligatoria.'
  const beeperGoal = level.goal.requireAllBeepers
    ? 'Recoger todas las fichas que quedan en el tablero antes de terminar en la meta.'
    : level.initialWorld.beepers.length === 0
      ? 'Este nivel no tiene fichas; solo hay que cumplir el recorrido y llegar a la meta.'
      : 'Recoger fichas no es requisito de finalización en este nivel.'

  return [
    `NIVEL ACTUAL: ${level.title}`,
    `DESCRIPCION: ${level.subtitle}`,
    `OBJETIVO: ${level.objective}`,
    `META EXACTA: calle ${level.goal.position.street}, avenida ${level.goal.position.avenue}${level.goal.direction ? `, mirando al ${level.goal.direction.toLowerCase()}` : ', con cualquier orientación'}.`,
    `RECORRIDO OBLIGATORIO: ${requiredVisits}`,
    `FICHAS DEL OBJETIVO: ${beeperGoal}`,
    `COMANDOS DEL NIVEL: ${level.commands.join(', ')}`,
    `BOTONES DE COMANDOS RAPIDOS: ${level.quickCommands.join(', ')}. Los bloques ya incluyen sus instrucciones internas.`,
    `CONDICIONES DEL NIVEL: ${level.conditions.join(', ') || 'Ninguna; este nivel no usa decisiones.'}`,
    buildMapMatrix(level, runtimeContext),
    buildTivotRuntimeContext(runtimeContext),
  ].join('\n')
}

export const buildConversationPrompt = (
  query: string,
  level: KarelLevel | null = null,
  runtimeContext: TivotAiContext | null = null,
): string =>
  [
    KAREL_SYSTEM_PROMPT,
    '',
    buildKarelLevelContext(level, runtimeContext),
    '',
    `Mensaje del usuario: ${query}`,
  ].join('\n')
