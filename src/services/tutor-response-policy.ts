interface TutorResponseSummary {
  message: string
  suggestsCode: boolean
  suggestedCode: string[] | null
}

const normalizeRequest = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const explicitlyRequestsCode = (text: string): boolean => {
  const normalized = normalizeRequest(text)

  return (
    /\b(dame|ponme|muestrame|escribe|genera|quiero|quisiera|necesito)\b[^.?!]{0,100}\b(codigo|ejemplo|programa)\b/.test(normalized) ||
    /\b(probar|aplicar|cargar)\b[^.?!]{0,40}\bcodigo\b/.test(normalized) ||
    /\bcodigo\b[^.?!]{0,40}\b(probar|aplicar|cargar)\b/.test(normalized) ||
    /\b(dame|muestrame|escribe|genera|quiero|quisiera|necesito)\b[^.?!]{0,100}\b(solucion|respuesta)\b/.test(normalized) ||
    /\b(solucion|respuesta)\s+(directa|completa)\b/.test(normalized) ||
    /\b(resuelve|soluciona)(lo|me)?\b/.test(normalized)
  )
}

export const requestsContourCodeExample = (text: string): boolean =>
  /\b(contorno|perimetro|borde|orilla)\b/.test(normalizeRequest(text))

export const createSafeKarelCodeExample = (
  request: string,
  allowedCommands: readonly string[] = ['avanza'],
): string[] => {
  const allowed = new Set(allowedCommands)
  const canTraverseContour = requestsContourCodeExample(request) &&
    ['avanza', 'gira-izquierda', 'repetir', 'mientras'].every((command) => allowed.has(command))

  if (canTraverseContour) {
    return [
      'iniciar-programa',
      '  repetir 4 veces inicio',
      '    mientras frente-libre hacer inicio',
      '      avanza;',
      '    fin;',
      '    repetir 3 veces inicio',
      '      gira-izquierda;',
      '    fin;',
      '  fin;',
      'finalizar-programa',
    ]
  }

  return ['iniciar-programa', '  avanza;', 'finalizar-programa']
}

export const needsTutorResponseCorrection = (
  response: TutorResponseSummary,
  codeWasRequested: boolean,
): boolean => {
  const hasApplicableCode = response.suggestsCode && isApplicableKarelProgram(response.suggestedCode)
  const promisesCodeAction = /\b(probar codigo|codigo listo|boton verde)\b/.test(normalizeRequest(response.message))

  return (codeWasRequested && !hasApplicableCode) || (promisesCodeAction && !hasApplicableCode)
}

export const isApplicableKarelProgram = (suggestedCode: string[] | null): boolean => {
  if (!suggestedCode?.length) return false

  const lines = suggestedCode
    .flatMap((line) => line.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines[0] !== 'iniciar-programa' || lines.at(-1) !== 'finalizar-programa') return false

  const definitions = new Set(
    lines.flatMap((line) => line.match(/^define-nueva-instruccion\s+([a-zA-Z][\w-]*)\s+como\s+inicio$/)?.[1] ?? []),
  )
  let openBlocks = 0

  for (const line of lines.slice(1, -1)) {
    if (/^(repetir\s+[1-9]\d*\s+veces|si\s+(frente-libre|junto-a-ficha|orientado-al-norte)\s+entonces|mientras\s+(frente-libre|junto-a-ficha|orientado-al-norte)\s+hacer|define-nueva-instruccion\s+[a-zA-Z][\w-]*\s+como)\s+inicio$/.test(line)) {
      openBlocks += 1
      continue
    }
    if (line === 'fin;') {
      openBlocks -= 1
      if (openBlocks < 0) return false
      continue
    }
    if (/^(avanza|gira-izquierda|coge-ficha|deja-ficha);$/.test(line)) continue
    const call = line.match(/^([a-zA-Z][\w-]*);$/)?.[1]
    if (!call || !definitions.has(call)) return false
  }

  return openBlocks === 0
}

export const TUTOR_CODE_CORRECTION_REQUEST = [
  'El estudiante pidió explícitamente el código o la solución directa y completa.',
  'Tu respuesta anterior no incluyó líneas para el botón Probar código.',
  'Corrígela ahora: devuelve únicamente JSON válido con sugiereCodigo=true y codigoSugerido como una lista no vacía.',
  'Incluye un programa Karel completo y válido que cumpla todo el objetivo del nivel actual, desde iniciar-programa hasta finalizar-programa; no entregues una pista ni una solución parcial.',
  'No digas que debe guardar, copiar o pegar: la interfaz lo cargará automáticamente.',
].join(' ')
