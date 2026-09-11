import { describeCodeLines, getInsertionIndex } from './code-lines'

export function insertProgramLines(code: string, source: string[], selected: number | null, options?: {
  index?: number; replaceSelection?: boolean
}): { code: string; selected: number } {
  const descriptions = describeCodeLines(code)
  if (selected !== null) selected = descriptions[selected]?.closingBlock ?? selected
  const selection = selected === null ? undefined : descriptions[selected]
  const replace = options?.replaceSelection !== false && selection && !selection.fixed
  const index = replace ? selected! : options?.index ?? getInsertionIndex(descriptions, selected)
  const previous = descriptions[index - 1]
  const depth = replace
    ? selection.depth
    : previous?.opensBlock
      ? previous.depth + 1
      : previous?.depth ?? descriptions[index]?.depth ?? 1
  const lines = code.split('\n')
  lines.splice(index, replace ? selection.end - index + 1 : 0, ...source.map(line => '  '.repeat(Math.max(1, depth)) + line))
  return { code: lines.join('\n'), selected: index }
}

export function updateProgramLine(code: string, index: number, value: string): string {
  const lines = code.split('\n')
  if (!lines[index] && lines[index] !== '') return code
  if (describeCodeLines(code)[index]?.fixed) return code
  const indent = lines[index].match(/^\s*/)?.[0] ?? ''
  lines.splice(index, 1, ...value.replace(/\r\n?/g, '\n').split('\n').map(line => indent + line))
  return lines.join('\n')
}

// Parameter changes preserve the entire block, including nested instructions.
export function configureProgramLine(code: string, index: number, header: string): string {
  const oldName = describeCodeLines(code)[index]?.text.match(/^define-nueva-instruccion\s+([\w-]+)/)?.[1]
  const newName = header.match(/^define-nueva-instruccion\s+([\w-]+)/)?.[1]
  const updated = updateProgramLine(code, index, header)
  if (!oldName || !newName || oldName === newName) return updated
  return updated.split('\n').map(line => line.replace(/^(\s*)([\w-]+);(\s*(?:\/\/.*)?)$/, (match, indent, name, tail) =>
    name === oldName ? `${indent}${newName};${tail}` : match)).join('\n')
}
