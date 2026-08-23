import type { TivotFlowNode } from '../value-objects/tivot-payload.vo'

export type TivotProblemMode = 'standard_text' | 'interactive_flow'
export type TivotProblemDifficulty = 'Junior' | 'Mid' | 'Senior' | 'Staff'

interface TivotProblemBase {
  problem_id: string
  mode: TivotProblemMode
  title: string
  difficulty: TivotProblemDifficulty
  tags: string[]
  system_context: string
}

export interface TivotStandardTextProblem extends TivotProblemBase {
  mode: 'standard_text'
  evaluation_criteria: string
}

export interface TivotFlowDefinition {
  instruction: string
  nodes: TivotFlowNode[]
  valid_orders: string[][]
}

export interface TivotInteractiveFlowProblem extends TivotProblemBase {
  mode: 'interactive_flow'
  flow_definition: TivotFlowDefinition
  failure_hints: Record<string, string>
}

export type TivotProblem = TivotStandardTextProblem | TivotInteractiveFlowProblem

export const isInteractiveFlowProblem = (problem: TivotProblem): problem is TivotInteractiveFlowProblem =>
  problem.mode === 'interactive_flow'
