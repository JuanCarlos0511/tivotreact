import { useEffect, useRef, useState } from 'react'
import type { KarelDirection, KarelWorldState } from '@shared/types'

export interface ExecutionStep {
  lineNumber: number
  command: string
  worldSnapshot: KarelWorldState
  error?: string
}

export interface CompileResult {
  success: boolean
  warning?: string
  error?: {
    line: number
    message: string
  }
}

type BasicCommand = 'avanza;' | 'gira-izquierda;' | 'coge-zumbador;' | 'deja-zumbador;' | 'apagate;'
type Condition = 'frente-libre' | 'junto-a-zumbador' | 'orientado-al-norte'

type Statement =
  | { type: 'basic'; command: BasicCommand; lineNumber: number }
  | { type: 'call'; name: string; lineNumber: number }
  | { type: 'repeat'; count: number; body: Statement[]; lineNumber: number }
  | { type: 'while'; condition: Condition; body: Statement[]; lineNumber: number }
  | { type: 'if'; condition: Condition; body: Statement[]; lineNumber: number }

interface ParsedProgram {
  main: Statement[]
  procedures: Map<string, Statement[]>
  endLineNumber: number
}

interface SourceLine {
  text: string
  lineNumber: number
}

const BASIC_COMMANDS = new Set<BasicCommand>([
  'avanza;',
  'gira-izquierda;',
  'coge-zumbador;',
  'deja-zumbador;',
  'apagate;',
])
const CONDITIONS = new Set<Condition>(['frente-libre', 'junto-a-zumbador', 'orientado-al-norte'])
const MAX_WHILE_ITERATIONS = 64
const BASE_STEP_DELAY_MS = 600
const MISSING_SHUTDOWN_WARNING =
  "Recordatorio: al terminar de usar a Karel, agrega 'apagate;' para cerrar formalmente el programa."
export type KarelSpeedMultiplier = 0.5 | 1 | 1.5 | 2

const cloneWorld = (world: KarelWorldState): KarelWorldState => ({
  karelPosition: { ...world.karelPosition },
  karelDirection: world.karelDirection,
  beepers: world.beepers.map((beeper) => ({ ...beeper })),
  bagBeepers: world.bagBeepers,
})

const turnLeft = (direction: KarelDirection): KarelDirection => {
  const turns: Record<KarelDirection, KarelDirection> = {
    NORTE: 'OESTE',
    OESTE: 'SUR',
    SUR: 'ESTE',
    ESTE: 'NORTE',
  }

  return turns[direction]
}

const getNextPosition = (world: KarelWorldState) => {
  const { street, avenue } = world.karelPosition
  if (world.karelDirection === 'NORTE') return { street: street + 1, avenue }
  if (world.karelDirection === 'SUR') return { street: street - 1, avenue }
  if (world.karelDirection === 'ESTE') return { street, avenue: avenue + 1 }
  return { street, avenue: avenue - 1 }
}

const isInsideWorld = (position: { street: number; avenue: number }) =>
  position.street >= 1 && position.street <= 8 && position.avenue >= 1 && position.avenue <= 8

const hasBeeper = (world: KarelWorldState) =>
  world.beepers.some(
    (beeper) =>
      beeper.street === world.karelPosition.street &&
      beeper.avenue === world.karelPosition.avenue &&
      beeper.count > 0,
  )

const evaluateCondition = (condition: Condition, world: KarelWorldState): boolean => {
  if (condition === 'frente-libre') return isInsideWorld(getNextPosition(world))
  if (condition === 'junto-a-zumbador') return hasBeeper(world)
  return world.karelDirection === 'NORTE'
}

const applyCommand = (command: BasicCommand, world: KarelWorldState): { world: KarelWorldState; error?: string } => {
  const nextWorld = cloneWorld(world)

  if (command === 'avanza;') {
    const nextPosition = getNextPosition(nextWorld)
    if (!isInsideWorld(nextPosition)) return { world, error: 'Error: Karel choco con un muro' }
    nextWorld.karelPosition = nextPosition
    return { world: nextWorld }
  }

  if (command === 'gira-izquierda;') {
    nextWorld.karelDirection = turnLeft(nextWorld.karelDirection)
    return { world: nextWorld }
  }

  if (command === 'coge-zumbador;') {
    const beeperIndex = nextWorld.beepers.findIndex(
      (beeper) =>
        beeper.street === nextWorld.karelPosition.street &&
        beeper.avenue === nextWorld.karelPosition.avenue &&
        beeper.count > 0,
    )
    if (beeperIndex < 0) return { world: nextWorld }

    const nextBeepers = [...nextWorld.beepers]
    const currentBeeper = nextBeepers[beeperIndex]
    if (!currentBeeper) return { world: nextWorld }

    if (currentBeeper.count === 1) {
      nextBeepers.splice(beeperIndex, 1)
    } else {
      nextBeepers[beeperIndex] = { ...currentBeeper, count: currentBeeper.count - 1 }
    }
    nextWorld.beepers = nextBeepers
    nextWorld.bagBeepers += 1
    return { world: nextWorld }
  }

  if (command === 'deja-zumbador;') {
    if (nextWorld.bagBeepers <= 0) return { world, error: 'Error: No tienes zumbadores en la mochila' }

    const beeperIndex = nextWorld.beepers.findIndex(
      (beeper) =>
        beeper.street === nextWorld.karelPosition.street && beeper.avenue === nextWorld.karelPosition.avenue,
    )
    const nextBeepers = [...nextWorld.beepers]
    if (beeperIndex >= 0) {
      const currentBeeper = nextBeepers[beeperIndex]
      if (currentBeeper) nextBeepers[beeperIndex] = { ...currentBeeper, count: currentBeeper.count + 1 }
    } else {
      nextBeepers.push({ ...nextWorld.karelPosition, count: 1 })
    }

    nextWorld.beepers = nextBeepers
    nextWorld.bagBeepers -= 1
    return { world: nextWorld }
  }

  return { world: nextWorld }
}

const cleanSourceLines = (code: string): SourceLine[] =>
  code
    .split('\n')
    .map((rawLine, index) => ({
      text: rawLine.replace(/\/\/.*$/, '').trim(),
      lineNumber: index + 1,
    }))
    .filter((line) => line.text.length > 0)

const parseProgram = (code: string): { program?: ParsedProgram; result: CompileResult } => {
  const lines = cleanSourceLines(code)
  const firstLine = lines[0]
  const lastLine = lines.at(-1)
  if (firstLine?.text !== 'iniciar-programa') {
    return { result: { success: false, error: { line: firstLine?.lineNumber ?? 1, message: 'Falta iniciar-programa' } } }
  }
  if (lastLine?.text !== 'finalizar-programa') {
    return {
      result: { success: false, error: { line: lastLine?.lineNumber ?? 1, message: 'Falta finalizar-programa' } },
    }
  }

  const startIndex = lines.findIndex((line) => line.text === 'inicia-ejecucion')
  const endIndex = lines.findIndex((line) => line.text === 'termina-ejecucion')
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return {
      result: {
        success: false,
        error: { line: firstLine.lineNumber, message: 'Falta el bloque inicia-ejecucion ... termina-ejecucion' },
      },
    }
  }

  const procedures = new Map<string, Statement[]>()
  let procedureCursor = 1
  while (procedureCursor < startIndex) {
    const line = lines[procedureCursor]
    if (!line) break
    const procedureMatch = line.text.match(/^define-nueva-instruccion\s+([a-zA-Z][\w-]*)\s+como\s+inicio$/)
    if (!procedureMatch) {
      return {
        result: {
          success: false,
          error: { line: line.lineNumber, message: 'Solo se permiten definiciones antes de inicia-ejecucion' },
        },
      }
    }

    const procedureName = procedureMatch[1]
    if (!procedureName) {
      return { result: { success: false, error: { line: line.lineNumber, message: 'Nombre de instruccion invalido' } } }
    }
    const parsed = parseBlock(lines, procedureCursor + 1, procedures)
    if (!parsed.success) return { result: parsed.result }
    procedures.set(procedureName, parsed.statements)
    procedureCursor = parsed.nextIndex
  }

  const parsedMain = parseBlock(lines, startIndex + 1, procedures, endIndex)
  if (!parsedMain.success) return { result: parsedMain.result }
  const warning = statementsMayPowerOff(parsedMain.statements, procedures) ? undefined : MISSING_SHUTDOWN_WARNING

  return {
    program: { main: parsedMain.statements, procedures, endLineNumber: lines[endIndex]?.lineNumber ?? lastLine.lineNumber },
    result: warning ? { success: true, warning } : { success: true },
  }
}

const statementsMayPowerOff = (
  statements: Statement[],
  procedures: Map<string, Statement[]>,
  visitedProcedures = new Set<string>(),
): boolean =>
  statements.some((statement) => {
    if (statement.type === 'basic') return statement.command === 'apagate;'
    if (statement.type === 'repeat' || statement.type === 'while' || statement.type === 'if') {
      return statementsMayPowerOff(statement.body, procedures, visitedProcedures)
    }
    if (visitedProcedures.has(statement.name)) return false
    const procedureBody = procedures.get(statement.name)
    if (!procedureBody) return false

    visitedProcedures.add(statement.name)
    return statementsMayPowerOff(procedureBody, procedures, visitedProcedures)
  })

type ParseBlockResult =
  | { success: true; statements: Statement[]; nextIndex: number }
  | { success: false; result: CompileResult }

const parseBlock = (
  lines: SourceLine[],
  startIndex: number,
  procedures: Map<string, Statement[]>,
  explicitEndIndex?: number,
): ParseBlockResult => {
  const statements: Statement[] = []
  let cursor = startIndex

  while (cursor < lines.length) {
    if (explicitEndIndex !== undefined && cursor >= explicitEndIndex) {
      return { success: true, statements, nextIndex: cursor }
    }

    const line = lines[cursor]
    if (!line) break
    if (line.text === 'fin;') return { success: true, statements, nextIndex: cursor + 1 }
    if (line.text === 'termina-ejecucion') return { success: true, statements, nextIndex: cursor }

    const repeatMatch = line.text.match(/^repetir\s+(\d+)\s+veces\s+inicio$/)
    if (repeatMatch) {
      const parsed = parseBlock(lines, cursor + 1, procedures)
      if (!parsed.success) return parsed
      statements.push({ type: 'repeat', count: Number(repeatMatch[1]), body: parsed.statements, lineNumber: line.lineNumber })
      cursor = parsed.nextIndex
      continue
    }

    const whileMatch = line.text.match(/^mientras\s+([\w-]+)\s+hacer\s+inicio$/)
    if (whileMatch) {
      const condition = parseCondition(whileMatch[1], line.lineNumber)
      if (!condition.success) return { success: false, result: condition.result }
      const parsed = parseBlock(lines, cursor + 1, procedures)
      if (!parsed.success) return parsed
      statements.push({ type: 'while', condition: condition.value, body: parsed.statements, lineNumber: line.lineNumber })
      cursor = parsed.nextIndex
      continue
    }

    const ifMatch = line.text.match(/^si\s+([\w-]+)\s+entonces\s+inicio$/)
    if (ifMatch) {
      const condition = parseCondition(ifMatch[1], line.lineNumber)
      if (!condition.success) return { success: false, result: condition.result }
      const parsed = parseBlock(lines, cursor + 1, procedures)
      if (!parsed.success) return parsed
      statements.push({ type: 'if', condition: condition.value, body: parsed.statements, lineNumber: line.lineNumber })
      cursor = parsed.nextIndex
      continue
    }

    if (!line.text.endsWith(';')) {
      return {
        success: false,
        result: { success: false, error: { line: line.lineNumber, message: 'La sentencia debe terminar con punto y coma' } },
      }
    }

    if (BASIC_COMMANDS.has(line.text as BasicCommand)) {
      statements.push({ type: 'basic', command: line.text as BasicCommand, lineNumber: line.lineNumber })
      cursor += 1
      continue
    }

    const callName = line.text.slice(0, -1)
    if (procedures.has(callName)) {
      statements.push({ type: 'call', name: callName, lineNumber: line.lineNumber })
      cursor += 1
      continue
    }

    return {
      success: false,
      result: { success: false, error: { line: line.lineNumber, message: `Comando no reconocido: ${line.text}` } },
    }
  }

  return {
    success: false,
    result: { success: false, error: { line: lines.at(-1)?.lineNumber ?? 1, message: 'Falta cerrar el bloque con fin;' } },
  }
}

const parseCondition = (
  candidate: string | undefined,
  lineNumber: number,
): { success: true; value: Condition } | { success: false; result: CompileResult } => {
  if (candidate && CONDITIONS.has(candidate as Condition)) {
    return { success: true, value: candidate as Condition }
  }

  return {
    success: false,
    result: { success: false, error: { line: lineNumber, message: `Condicion no reconocida: ${candidate ?? ''}` } },
  }
}

const createExecutionSteps = (program: ParsedProgram, initialWorld: KarelWorldState): ExecutionStep[] => {
  const steps: ExecutionStep[] = []
  let world = cloneWorld(initialWorld)
  let isPoweredOff = false

  const pushStep = (lineNumber: number, command: string, nextWorld: KarelWorldState, error?: string) => {
    const step = error
      ? { lineNumber, command, worldSnapshot: cloneWorld(nextWorld), error }
      : { lineNumber, command, worldSnapshot: cloneWorld(nextWorld) }
    steps.push(step)
  }

  const executeStatements = (statements: Statement[]): void => {
    for (const statement of statements) {
      if (isPoweredOff || steps.at(-1)?.error) return

      if (statement.type === 'basic') {
        const result = applyCommand(statement.command, world)
        world = cloneWorld(result.world)
        pushStep(statement.lineNumber, statement.command, world, result.error)
        if (statement.command === 'apagate;' || result.error) isPoweredOff = true
        continue
      }

      if (statement.type === 'call') {
        executeStatements(program.procedures.get(statement.name) ?? [])
        continue
      }

      if (statement.type === 'repeat') {
        for (let index = 0; index < statement.count; index += 1) executeStatements(statement.body)
        continue
      }

      if (statement.type === 'if') {
        if (evaluateCondition(statement.condition, world)) executeStatements(statement.body)
        continue
      }

      let iterations = 0
      while (evaluateCondition(statement.condition, world) && !isPoweredOff && !steps.at(-1)?.error) {
        if (iterations >= MAX_WHILE_ITERATIONS) {
          pushStep(statement.lineNumber, statement.condition, world, 'Error: El bucle mientras excedio el limite de seguridad')
          isPoweredOff = true
          return
        }
        executeStatements(statement.body)
        iterations += 1
      }
    }
  }

  executeStatements(program.main)
  return steps
}

export const useKarelRunner = (initialWorld: KarelWorldState) => {
  const timeoutRef = useRef<number | null>(null)
  const stepsRef = useRef<ExecutionStep[]>([])
  const currentStepIndexRef = useRef(-1)
  const speedMultiplierRef = useRef<KarelSpeedMultiplier>(1)
  const [worldState, setWorldState] = useState<KarelWorldState>(() => cloneWorld(initialWorld))
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [activeLineNumber, setActiveLineNumber] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null)
  const [speedMultiplier, setSpeedMultiplierState] = useState<KarelSpeedMultiplier>(1)

  useEffect(() => {
    resetExecution()
    return () => clearPendingTimeout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorld])

  const clearPendingTimeout = () => {
    if (timeoutRef.current === null) return
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }

  const compileCode = (code: string): CompileResult => {
    const { result } = parseProgram(code)
    setCompileResult(result)
    return result
  }

  const getDelayMs = () => BASE_STEP_DELAY_MS / speedMultiplierRef.current

  const setCurrentStep = (stepIndex: number) => {
    currentStepIndexRef.current = stepIndex
    setCurrentStepIndex(stepIndex)

    if (stepIndex < 0) {
      setWorldState(cloneWorld(initialWorld))
      setActiveLineNumber(null)
      setExecutionError(null)
      return
    }

    const step = stepsRef.current[stepIndex]
    if (!step) return

    setWorldState(cloneWorld(step.worldSnapshot))
    setActiveLineNumber(step.lineNumber)
    setExecutionError(step.error ?? null)
  }

  const prepareSteps = (code: string): boolean => {
    const parsed = parseProgram(code)
    setCompileResult(parsed.result)
    if (!parsed.result.success || !parsed.program) return false

    const nextSteps = createExecutionSteps(parsed.program, initialWorld)
    stepsRef.current = nextSteps
    setSteps(nextSteps)
    return true
  }

  const resetExecution = () => {
    clearPendingTimeout()
    stepsRef.current = []
    currentStepIndexRef.current = -1
    setWorldState(cloneWorld(initialWorld))
    setSteps([])
    setCurrentStepIndex(-1)
    setActiveLineNumber(null)
    setIsRunning(false)
    setIsPaused(false)
    setExecutionError(null)
    setCompileResult(null)
  }

  const setSpeedMultiplier = (nextSpeedMultiplier: KarelSpeedMultiplier) => {
    speedMultiplierRef.current = nextSpeedMultiplier
    setSpeedMultiplierState(nextSpeedMultiplier)
  }

  const playFrom = (stepIndex: number) => {
    const step = stepsRef.current[stepIndex]
    if (!step) {
      setIsRunning(false)
      setIsPaused(false)
      setActiveLineNumber(null)
      return
    }

    setIsRunning(true)
    setIsPaused(false)
    setCurrentStep(stepIndex)
    if (step.error) {
      setIsRunning(false)
      return
    }

    timeoutRef.current = window.setTimeout(() => playFrom(stepIndex + 1), getDelayMs())
  }

  const runCode = (code: string) => {
    clearPendingTimeout()
    if (!prepareSteps(code)) return
    currentStepIndexRef.current = -1
    setCurrentStepIndex(-1)
    setWorldState(cloneWorld(initialWorld))
    setActiveLineNumber(null)
    setExecutionError(null)
    playFrom(0)
  }

  const pauseExecution = () => {
    if (!isRunning) return
    clearPendingTimeout()
    setIsRunning(false)
    setIsPaused(true)
  }

  const resumeExecution = () => {
    if (!isPaused) return
    clearPendingTimeout()
    playFrom(currentStepIndexRef.current + 1)
  }

  const togglePause = () => {
    if (isPaused) {
      resumeExecution()
      return
    }

    pauseExecution()
  }

  const stepForward = (code: string) => {
    clearPendingTimeout()
    if (stepsRef.current.length === 0 && !prepareSteps(code)) return
    setIsRunning(false)
    setIsPaused(false)
    const nextIndex = Math.min(currentStepIndexRef.current + 1, stepsRef.current.length - 1)
    setCurrentStep(nextIndex)
  }

  const stepBack = () => {
    clearPendingTimeout()
    setIsRunning(false)
    setIsPaused(false)
    const nextIndex = Math.max(currentStepIndexRef.current - 1, -1)
    setCurrentStep(nextIndex)
  }

  return {
    worldState,
    steps,
    currentStepIndex,
    activeLineNumber,
    isRunning,
    isPaused,
    executionError,
    compileResult,
    speedMultiplier,
    setSpeedMultiplier,
    compileCode,
    runCode,
    pauseExecution,
    resumeExecution,
    togglePause,
    stepForward,
    stepBack,
    resetExecution,
  }
}
