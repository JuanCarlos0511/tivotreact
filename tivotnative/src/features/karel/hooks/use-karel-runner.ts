import { useEffect, useRef, useState } from 'react'
import type { KarelDirection, KarelWorldState } from '../../../shared/types'

export interface ExecutionLoop {
  lineNumber: number
  endLineNumber: number
  iteration: number
  total?: number
}

export interface ExecutionStep {
  loops: ExecutionLoop[]
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

type BasicCommand =
  | 'avanza;'
  | 'gira-izquierda;'
  | 'coge-ficha;'
  | 'deja-ficha;'
  | 'coge-zumbador;'
  | 'deja-zumbador;'
type Condition = 'frente-libre' | 'junto-a-ficha' | 'junto-a-zumbador' | 'orientado-al-norte'

type Statement =
  | { type: 'basic'; command: BasicCommand; lineNumber: number }
  | { type: 'call'; name: string; lineNumber: number }
  | { type: 'repeat'; count: number; body: Statement[]; lineNumber: number; endLineNumber: number }
  | { type: 'while'; condition: Condition; body: Statement[]; lineNumber: number; endLineNumber: number }
  | { type: 'if'; condition: Condition; body: Statement[]; lineNumber: number; endLineNumber: number }

interface ParsedProgram {
  startLineNumber: number
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
  'coge-ficha;',
  'deja-ficha;',
  'coge-zumbador;',
  'deja-zumbador;',
])
const CONDITIONS = new Set<Condition>([
  'frente-libre',
  'junto-a-ficha',
  'junto-a-zumbador',
  'orientado-al-norte',
])
const MAX_WHILE_ITERATIONS = 64
const BASE_STEP_DELAY_MS = 600
const MAX_EXECUTION_STEPS = 4096
const MAX_BLOCK_DEPTH = 64
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
  if (condition === 'junto-a-ficha' || condition === 'junto-a-zumbador') return hasBeeper(world)
  return world.karelDirection === 'NORTE'
}

const applyCommand = (command: BasicCommand, world: KarelWorldState): { world: KarelWorldState; error?: string } => {
  const nextWorld = cloneWorld(world)

  if (command === 'avanza;') {
    const nextPosition = getNextPosition(nextWorld)
    if (!isInsideWorld(nextPosition)) return { world, error: 'Karel chocó con un muro' }
    nextWorld.karelPosition = nextPosition
    return { world: nextWorld }
  }

  if (command === 'gira-izquierda;') {
    nextWorld.karelDirection = turnLeft(nextWorld.karelDirection)
    return { world: nextWorld }
  }

  if (command === 'coge-ficha;' || command === 'coge-zumbador;') {
    const beeperIndex = nextWorld.beepers.findIndex(
      (beeper) =>
        beeper.street === nextWorld.karelPosition.street &&
        beeper.avenue === nextWorld.karelPosition.avenue &&
        beeper.count > 0,
    )
    if (beeperIndex < 0) return { world, error: 'No hay fichas en esta casilla' }

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

  if (command === 'deja-ficha;' || command === 'deja-zumbador;') {
    if (nextWorld.bagBeepers <= 0) return { world, error: 'No tienes fichas en la mochila' }

    const beeperIndex = nextWorld.beepers.findIndex(
      (beeper) =>
        beeper.street === nextWorld.karelPosition.street && beeper.avenue === nextWorld.karelPosition.avenue,
    )
    const nextBeepers = [...nextWorld.beepers]
    if (beeperIndex >= 0) {
      return { world, error: 'Ya hay una ficha en esta casilla' }
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

  const procedures = new Map<string, Statement[]>()
  // Collect names first so definitions can call each other; execution is bounded below.
  for (const line of lines) {
    const name = line.text.match(/^define-nueva-instruccion\s+([a-zA-Z][\w-]*)\s+como\s+inicio$/)?.[1]
    if (name) {
      if (procedures.has(name) || BASIC_COMMANDS.has(`${name};` as BasicCommand) ||
          ['apagate', 'apagar', 'iniciar-programa', 'finalizar-programa', 'inicia-ejecucion', 'termina-ejecucion',
            'repetir', 'si', 'mientras', 'define-nueva-instruccion', 'inicio', 'fin'].includes(name)) {
        return { result: { success: false, error: { line: line.lineNumber, message: 'Nombre de instrucción duplicado o reservado' } } }
      }
      procedures.set(name, [])
    }
  }
  const parsedMain = parseBlock(lines, 1, procedures, lines.length - 1)
  if (!parsedMain.success) return { result: parsedMain.result }
  return {
    program: { startLineNumber: firstLine.lineNumber, main: parsedMain.statements, procedures, endLineNumber: lastLine.lineNumber },
    result: { success: true },
  }
}

type ParseBlockResult =
  | { success: true; statements: Statement[]; nextIndex: number }
  | { success: false; result: CompileResult }

const parseBlock = (
  lines: SourceLine[],
  startIndex: number,
  procedures: Map<string, Statement[]>,
  explicitEndIndex?: number,
  depth = 0,
): ParseBlockResult => {
  if (depth > MAX_BLOCK_DEPTH) return {
    success: false, result: { success: false, error: { line: lines[startIndex]?.lineNumber ?? 1, message: 'Demasiados bloques anidados' } },
  }
  const statements: Statement[] = []
  let cursor = startIndex

  while (cursor < lines.length) {
    if (explicitEndIndex !== undefined && cursor >= explicitEndIndex) {
      return { success: true, statements, nextIndex: cursor }
    }

    const line = lines[cursor]
    if (!line) break
    if (line.text === 'fin;') {
      if (explicitEndIndex === undefined) return { success: true, statements, nextIndex: cursor + 1 }
      return { success: false, result: { success: false, error: { line: line.lineNumber, message: 'fin; no tiene un bloque abierto' } } }
    }
    if (line.text === 'finalizar-programa') break
    const definition = line.text.match(/^define-nueva-instruccion\s+([a-zA-Z][\w-]*)\s+como\s+inicio$/)
    if (definition) {
      if (depth > 0) return { success: false, result: { success: false, error: { line: line.lineNumber, message: 'Define las instrucciones fuera de otros bloques' } } }
      const parsed = parseBlock(lines, cursor + 1, procedures, undefined, depth + 1)
      if (!parsed.success) return parsed
      procedures.set(definition[1]!, parsed.statements)
      cursor = parsed.nextIndex
      continue
    }

    const repeatMatch = line.text.match(/^repetir\s+(\d+)\s+veces\s+inicio$/)
    if (repeatMatch) {
      if (!Number.isSafeInteger(Number(repeatMatch[1])) || Number(repeatMatch[1]) < 1) return {
        success: false, result: { success: false, error: { line: line.lineNumber, message: 'La repetición debe ser un entero mayor que cero' } },
      }
      const parsed = parseBlock(lines, cursor + 1, procedures, undefined, depth + 1)
      if (!parsed.success) return parsed
      statements.push({ type: 'repeat', count: Number(repeatMatch[1]), body: parsed.statements, lineNumber: line.lineNumber, endLineNumber: lines[parsed.nextIndex - 1]!.lineNumber })
      cursor = parsed.nextIndex
      continue
    }

    const whileMatch = line.text.match(/^mientras\s+([\w-]+)\s+hacer\s+inicio$/)
    if (whileMatch) {
      const condition = parseCondition(whileMatch[1], line.lineNumber)
      if (!condition.success) return { success: false, result: condition.result }
      const parsed = parseBlock(lines, cursor + 1, procedures, undefined, depth + 1)
      if (!parsed.success) return parsed
      statements.push({ type: 'while', condition: condition.value, body: parsed.statements, lineNumber: line.lineNumber, endLineNumber: lines[parsed.nextIndex - 1]!.lineNumber })
      cursor = parsed.nextIndex
      continue
    }

    const ifMatch = line.text.match(/^si\s+([\w-]+)\s+entonces\s+inicio$/)
    if (ifMatch) {
      const condition = parseCondition(ifMatch[1], line.lineNumber)
      if (!condition.success) return { success: false, result: condition.result }
      const parsed = parseBlock(lines, cursor + 1, procedures, undefined, depth + 1)
      if (!parsed.success) return parsed
      statements.push({ type: 'if', condition: condition.value, body: parsed.statements, lineNumber: line.lineNumber, endLineNumber: lines[parsed.nextIndex - 1]!.lineNumber })
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
  let stopped = false
  const loops: ExecutionLoop[] = []
  const pushStep = (lineNumber: number, command: string, error?: string) => {
    if (stopped) return
    const limitError = steps.length >= MAX_EXECUTION_STEPS - 1 ? 'Se excedió el límite de pasos del programa' : undefined
    const stepError = error || limitError
    steps.push({ lineNumber, command, worldSnapshot: cloneWorld(world), loops: loops.map(loop => ({ ...loop })), ...(stepError ? { error: stepError } : {}) })
    if (error || limitError) stopped = true
  }
  const executeStatements = (statements: Statement[], callDepth = 0): void => {
    for (const statement of statements) {
      if (stopped) return
      if (statement.type === 'basic') {
        const result = applyCommand(statement.command, world)
        world = result.world
        pushStep(statement.lineNumber, statement.command, result.error)
      } else if (statement.type === 'call') {
        pushStep(statement.lineNumber, `${statement.name};`, callDepth >= MAX_BLOCK_DEPTH ? 'Demasiadas llamadas anidadas' : undefined)
        if (!stopped) executeStatements(program.procedures.get(statement.name) ?? [], callDepth + 1)
      } else if (statement.type === 'if') {
        const matches = evaluateCondition(statement.condition, world)
        pushStep(statement.lineNumber, `si ${statement.condition}`)
        if (matches) {
          executeStatements(statement.body, callDepth)
          pushStep(statement.endLineNumber, 'fin;')
        }
      } else {
        let iteration = 0
        while (!stopped) {
          const matches = statement.type === 'repeat' ? iteration < statement.count : evaluateCondition(statement.condition, world)
          if (!matches) {
            if (statement.type === 'while') pushStep(statement.lineNumber, `mientras ${statement.condition}`)
            break
          }
          if (statement.type === 'while' && iteration >= MAX_WHILE_ITERATIONS) {
            pushStep(statement.lineNumber, 'mientras', 'El bucle mientras excedió el límite de seguridad')
            break
          }
          iteration += 1
          loops.push({ lineNumber: statement.lineNumber, endLineNumber: statement.endLineNumber, iteration,
            ...(statement.type === 'repeat' ? { total: statement.count } : {}) })
          pushStep(statement.lineNumber, statement.type === 'repeat' ? 'repetir' : 'mientras')
          if (!stopped) executeStatements(statement.body, callDepth)
          pushStep(statement.endLineNumber, 'fin;')
          loops.pop()
        }
      }
    }
  }
  pushStep(program.startLineNumber, 'iniciar-programa')
  executeStatements(program.main)
  pushStep(program.endLineNumber, 'finalizar-programa')
  return steps
}

// Pure entry point also used by regression tests and both playback modes.
export const buildExecution = (code: string, initialWorld: KarelWorldState) => {
  const { result, program } = parseProgram(code)
  return { result, steps: program ? createExecutionSteps(program, initialWorld) : [] }
}

export const useKarelRunner = (initialWorld: KarelWorldState) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  }, [initialWorld])

  const clearPendingTimeout = () => {
    if (timeoutRef.current === null) return
    clearTimeout(timeoutRef.current)
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
    if (!parsed.result.success || !parsed.program) {
      stepsRef.current = []
      setSteps([])
      setCurrentStep(-1)
      setIsRunning(false)
      setIsPaused(false)
      return false
    }

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
    // The timeout that entered this step has already fired. Playback state is
    // changed only when starting/resuming, not once per rendered step.
    timeoutRef.current = null
    const step = stepsRef.current[stepIndex]
    if (!step) {
      setIsRunning(false)
      setIsPaused(false)
      setActiveLineNumber(null)
      return
    }

    setCurrentStep(stepIndex)
    if (step.error) {
      setIsRunning(false)
      return
    }

    timeoutRef.current = setTimeout(() => playFrom(stepIndex + 1), getDelayMs())
  }

  const runCode = (code: string) => {
    clearPendingTimeout()
    if (!prepareSteps(code)) return
    currentStepIndexRef.current = -1
    setCurrentStepIndex(-1)
    setWorldState(cloneWorld(initialWorld))
    setActiveLineNumber(null)
    setExecutionError(null)
    setIsRunning(true)
    setIsPaused(false)
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
    setIsRunning(true)
    setIsPaused(false)
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
    activeLoops: steps[currentStepIndex]?.loops ?? [],
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
