import { COMMAND_TEMPLATES, getCustomCommands, describeCodeLines, type CommandTemplate } from './code-lines'

export const CONDITION_OPTIONS = [
  { value: 'frente-libre', label: 'Frente libre', description: 'El siguiente cruce no está fuera del mundo.' },
  { value: 'junto-a-ficha', label: 'Junto a ficha', description: 'Hay al menos una ficha en la esquina actual.' },
  { value: 'orientado-al-norte', label: 'Orientado al norte', description: 'Karel está mirando hacia el norte.' },
] as const
export type Condition = typeof CONDITION_OPTIONS[number]['value']
// Keep an existing condition visible when editing manually entered code.
export const getConditionOptions = (allowed: readonly string[], source?: string) =>
  CONDITION_OPTIONS.filter(option => allowed.includes(option.value) || source?.replace('-zumbador', '-ficha').includes(option.value))

export const needsConfiguration = (command: CommandTemplate) =>
  ['si', 'mientras', 'repetir', 'define-nueva-instruccion'].includes(command.id)

export function validateProcedureName(name: string, code: string, originalName?: string): string | null {
  if (!/^[a-zA-Z][\w-]*$/.test(name.trim())) return 'Usa un nombre que comience con una letra, sin espacios.'
  const reserved = [...COMMAND_TEMPLATES.map(command => command.id),
    ...CONDITION_OPTIONS.map(option => option.value),
    'inicio', 'fin', 'como', 'entonces', 'hacer', 'veces',
    'iniciar-programa', 'finalizar-programa', 'apagate', 'apagar', 'inicia-ejecucion', 'termina-ejecucion',
    'coge-zumbador', 'deja-zumbador', 'junto-a-zumbador']
  if (reserved.includes(name.trim().toLowerCase())) return 'Ese nombre está reservado por Karel.'
  if (getCustomCommands(describeCodeLines(code)).some(command => command.id !== originalName && command.id.toLowerCase() === name.trim().toLowerCase()))
    return 'Ya existe una instrucción con ese nombre.'
  return null
}

export function configureCommand(command: CommandTemplate, condition: Condition, repeatCount: number, procedureName: string): string[] {
  const body = condition === 'junto-a-ficha' ? 'coge-ficha;' : condition === 'orientado-al-norte' ? 'gira-izquierda;' : 'avanza;'
  if (command.id === 'si') return ['si ' + condition + ' entonces inicio', '  ' + body, 'fin;']
  if (command.id === 'mientras') return ['mientras ' + condition + ' hacer inicio', '  ' + body, 'fin;']
  if (command.id === 'repetir') return ['repetir ' + repeatCount + ' veces inicio', '  avanza;', 'fin;']
  if (command.id === 'define-nueva-instruccion') return ['define-nueva-instruccion ' + procedureName.trim() + ' como inicio', '  gira-izquierda;', 'fin;']
  return command.source
}
