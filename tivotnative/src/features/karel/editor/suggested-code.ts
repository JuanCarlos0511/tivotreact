export const createProgramFromSuggestion = (suggestedLines: string[]): string | null => {
  const lines = suggestedLines
    .flatMap(line => line.replace(/```(?:pascal|text)?/gi, '').split(/\r?\n/))
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0 && line.trim() !== '```')

  if (lines.length === 0) return null

  const firstLine = lines[0]?.trim()
  const lastLine = lines.at(-1)?.trim()
  if (firstLine === 'iniciar-programa' || lastLine === 'finalizar-programa') {
    return firstLine === 'iniciar-programa' && lastLine === 'finalizar-programa'
      ? lines.join('\n')
      : null
  }

  return ['iniciar-programa', ...lines.map(line => `  ${line}`), 'finalizar-programa'].join('\n')
}
