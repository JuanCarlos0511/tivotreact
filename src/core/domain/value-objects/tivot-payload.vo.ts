export type TivotAssistantPayloadType = 'standard_text' | 'interactive_flow'

export interface TivotFlowNode {
  id: string
  label: string
}

export interface TivotFlowData {
  instruction: string
  nodes: TivotFlowNode[]
}

export interface TivotPayloadMetadata {
  is_evaluation: boolean
  passed: boolean | null
  concept: string
}

interface TivotAssistantPayloadBase {
  type: TivotAssistantPayloadType
  problem_id: string | null
  message: string
  flow_data: TivotFlowData | null
  metadata: TivotPayloadMetadata
}

export interface TivotStandardTextPayload extends TivotAssistantPayloadBase {
  type: 'standard_text'
  flow_data: null
}

export interface TivotInteractiveFlowPayload extends TivotAssistantPayloadBase {
  type: 'interactive_flow'
  problem_id: string
  flow_data: TivotFlowData
}

export type TivotAssistantPayload = TivotStandardTextPayload | TivotInteractiveFlowPayload

export interface TivotTextUserPayload {
  user_action: 'send_message'
  message: string
}

export interface TivotSubmitFlowOrderPayload {
  user_action: 'submit_flow_order'
  problem_id: string
  submitted_order: string[]
  user_comment?: string
}

export type TivotUserPayload = TivotTextUserPayload | TivotSubmitFlowOrderPayload

export const createStandardTextPayload = (
  message: string,
  metadata: TivotPayloadMetadata,
  problemId: string | null = null,
): TivotStandardTextPayload => ({
  type: 'standard_text',
  problem_id: problemId,
  message,
  flow_data: null,
  metadata,
})
