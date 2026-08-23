import type { DragEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, Loader2, Send } from 'lucide-react'
import type { FlowSubmissionState, TivotInteractiveFlowPayload } from '@shared/types'
import { useFlowChallenge } from '../hooks/use-flow-challenge'
import { MarkdownMessage } from './MarkdownMessage'

interface ReorderableFlowProps {
  payload: TivotInteractiveFlowPayload
  submission: FlowSubmissionState | null
  onSubmit: (submittedOrder: string[]) => Promise<void>
}

export function ReorderableFlow({ payload, submission, onSubmit }: ReorderableFlowProps) {
  const isSubmitting = submission?.status === 'SUBMITTING'
  const isLocked = submission?.status === 'LOCKED'
  const isDisabled = isSubmitting || isLocked
  const flowChallenge = useFlowChallenge({
    initialNodes: payload.flow_data.nodes,
    resetKey: payload.problem_id,
    isDisabled,
  })

  const startLongPress = (event: PointerEvent<HTMLLIElement>, nodeId: string) => {
    flowChallenge.armLongPress(nodeId, event.pointerType)
  }

  const handleDragStart = (event: DragEvent<HTMLLIElement>, nodeId: string) => {
    if (isDisabled) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', nodeId)
    flowChallenge.startDrag(nodeId)
  }

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetNodeId: string) => {
    event.preventDefault()
    const sourceNodeId = flowChallenge.draggedNodeId ?? event.dataTransfer.getData('text/plain')
    if (sourceNodeId) {
      flowChallenge.moveNodeById(sourceNodeId, targetNodeId)
    }
    flowChallenge.endDrag()
  }

  const handleSubmit = async () => {
    if (isDisabled) return
    await onSubmit(flowChallenge.submittedOrder)
  }

  return (
    <section className="flow-widget" aria-label={payload.flow_data.instruction}>
      <p className="flow-instruction">{payload.flow_data.instruction}</p>
      <ol className="flow-node-list">
        {flowChallenge.nodes.map((node, index) => (
          <li
            key={node.id}
            className={`flow-node ${flowChallenge.draggedNodeId === node.id ? 'flow-node-dragging' : ''} ${flowChallenge.hoveredNodeId === node.id ? 'flow-node-hovered' : ''} ${flowChallenge.longPressedNodeId === node.id ? 'flow-node-armed' : ''}`}
            draggable={!isDisabled}
            onDragStart={(event) => handleDragStart(event, node.id)}
            onDragOver={(event) => {
              event.preventDefault()
              if (!isDisabled) flowChallenge.setHoveredNodeId(node.id)
            }}
            onDragLeave={() => {
              if (flowChallenge.hoveredNodeId === node.id) flowChallenge.setHoveredNodeId(null)
            }}
            onDrop={(event) => handleDrop(event, node.id)}
            onDragEnd={flowChallenge.endDrag}
            onPointerDown={(event) => startLongPress(event, node.id)}
            onPointerUp={flowChallenge.clearLongPress}
            onPointerCancel={flowChallenge.clearLongPress}
          >
            <GripVertical className="flow-node-grip" size={16} aria-hidden="true" />
            <span className="flow-node-index">{index + 1}</span>
            <span className="flow-node-label">{node.label}</span>
            <span className="flow-node-actions">
              <button
                type="button"
                className="flow-icon-button"
                aria-label="Subir paso"
                title="Subir paso"
                disabled={isDisabled || index === 0}
                onClick={() => flowChallenge.moveNode(index, index - 1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                className="flow-icon-button"
                aria-label="Bajar paso"
                title="Bajar paso"
                disabled={isDisabled || index === flowChallenge.nodes.length - 1}
                onClick={() => flowChallenge.moveNode(index, index + 1)}
              >
                <ArrowDown size={15} />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <button className="flow-submit-button" type="button" disabled={isDisabled} onClick={handleSubmit}>
        {isSubmitting ? <Loader2 className="spin" size={17} /> : isLocked ? <CheckCircle2 size={17} /> : <Send size={17} />}
        <span>{isSubmitting ? 'Validando' : isLocked ? 'Enviado' : 'Enviar orden'}</span>
      </button>
      {isLocked && submission?.feedback && (
        <div className={`flow-feedback ${submission.feedback.metadata.passed ? 'flow-feedback-success' : 'flow-feedback-warning'}`}>
          <MarkdownMessage text={submission.feedback.message} />
          <small>{submission.llmInvoked ? 'Pista de Tivot' : 'Revisado al instante'}</small>
        </div>
      )}
    </section>
  )
}
