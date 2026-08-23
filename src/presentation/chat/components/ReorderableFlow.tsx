import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, Loader2, Send } from 'lucide-react'
import type { TivotInteractiveFlowPayload, TivotFlowNode } from '@domain/value-objects/tivot-payload.vo'
import type { FlowSubmissionState } from '../types'
import { MarkdownMessage } from './MarkdownMessage'

interface ReorderableFlowProps {
  payload: TivotInteractiveFlowPayload
  submission: FlowSubmissionState | null
  onSubmit: (submittedOrder: string[]) => Promise<void>
}

export function ReorderableFlow({ payload, submission, onSubmit }: ReorderableFlowProps) {
  const [nodes, setNodes] = useState<TivotFlowNode[]>(() => payload.flow_data.nodes)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [longPressedNodeId, setLongPressedNodeId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)

  const isSubmitting = submission?.status === 'SUBMITTING'
  const isLocked = submission?.status === 'LOCKED'
  const isDisabled = isSubmitting || isLocked

  useEffect(() => {
    setNodes(payload.flow_data.nodes)
    setDraggedNodeId(null)
    setHoveredNodeId(null)
    setLongPressedNodeId(null)
  }, [payload.problem_id, payload.flow_data.nodes])

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current)
      }
    },
    [],
  )

  const moveNode = (fromIndex: number, toIndex: number) => {
    if (isDisabled || fromIndex === toIndex) return

    setNodes((currentNodes) => {
      const nextNodes = [...currentNodes]
      const [movedNode] = nextNodes.splice(fromIndex, 1)
      if (!movedNode) return currentNodes
      nextNodes.splice(toIndex, 0, movedNode)
      return nextNodes
    })
  }

  const moveNodeById = (sourceNodeId: string, targetNodeId: string) => {
    const sourceIndex = nodes.findIndex((node) => node.id === sourceNodeId)
    const targetIndex = nodes.findIndex((node) => node.id === targetNodeId)
    if (sourceIndex < 0 || targetIndex < 0) return
    moveNode(sourceIndex, targetIndex)
  }

  const startLongPress = (event: PointerEvent<HTMLLIElement>, nodeId: string) => {
    if (isDisabled) return
    if (event.pointerType === 'mouse') return

    longPressTimerRef.current = window.setTimeout(() => {
      setLongPressedNodeId(nodeId)
    }, 180)
  }

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleDragStart = (event: DragEvent<HTMLLIElement>, nodeId: string) => {
    if (isDisabled) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', nodeId)
    setDraggedNodeId(nodeId)
  }

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetNodeId: string) => {
    event.preventDefault()
    const sourceNodeId = draggedNodeId ?? event.dataTransfer.getData('text/plain')
    if (sourceNodeId) {
      moveNodeById(sourceNodeId, targetNodeId)
    }
    setDraggedNodeId(null)
    setHoveredNodeId(null)
    setLongPressedNodeId(null)
  }

  const handleSubmit = async () => {
    if (isDisabled) return
    await onSubmit(nodes.map((node) => node.id))
  }

  return (
    <section className="flow-widget" aria-label={payload.flow_data.instruction}>
      <p className="flow-instruction">{payload.flow_data.instruction}</p>
      <ol className="flow-node-list">
        {nodes.map((node, index) => (
          <li
            key={node.id}
            className={`flow-node ${draggedNodeId === node.id ? 'flow-node-dragging' : ''} ${hoveredNodeId === node.id ? 'flow-node-hovered' : ''} ${longPressedNodeId === node.id ? 'flow-node-armed' : ''}`}
            draggable={!isDisabled}
            onDragStart={(event) => handleDragStart(event, node.id)}
            onDragOver={(event) => {
              event.preventDefault()
              if (!isDisabled) setHoveredNodeId(node.id)
            }}
            onDragLeave={() => {
              if (hoveredNodeId === node.id) setHoveredNodeId(null)
            }}
            onDrop={(event) => handleDrop(event, node.id)}
            onDragEnd={() => {
              setDraggedNodeId(null)
              setHoveredNodeId(null)
              setLongPressedNodeId(null)
            }}
            onPointerDown={(event) => startLongPress(event, node.id)}
            onPointerUp={clearLongPress}
            onPointerCancel={clearLongPress}
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
                onClick={() => moveNode(index, index - 1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                className="flow-icon-button"
                aria-label="Bajar paso"
                title="Bajar paso"
                disabled={isDisabled || index === nodes.length - 1}
                onClick={() => moveNode(index, index + 1)}
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
          <small>{submission.llmInvoked ? 'Pista generada por IA' : 'Validacion determinista: 0 tokens'}</small>
        </div>
      )}
    </section>
  )
}
