import { useEffect, useRef, useState } from 'react'
import type { TivotFlowNode } from '@shared/types'

interface UseFlowChallengeOptions {
  initialNodes: TivotFlowNode[]
  resetKey: string
  isDisabled: boolean
}

export const useFlowChallenge = ({ initialNodes, resetKey, isDisabled }: UseFlowChallengeOptions) => {
  const [nodes, setNodes] = useState<TivotFlowNode[]>(() => initialNodes)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [longPressedNodeId, setLongPressedNodeId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setNodes(initialNodes)
    setDraggedNodeId(null)
    setHoveredNodeId(null)
    setLongPressedNodeId(null)
  }, [initialNodes, resetKey])

  useEffect(
    () => () => {
      clearLongPress()
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

  const startDrag = (nodeId: string) => {
    if (!isDisabled) {
      setDraggedNodeId(nodeId)
    }
  }

  const endDrag = () => {
    setDraggedNodeId(null)
    setHoveredNodeId(null)
    setLongPressedNodeId(null)
  }

  const armLongPress = (nodeId: string, pointerType: string) => {
    if (isDisabled || pointerType === 'mouse') return

    longPressTimerRef.current = window.setTimeout(() => {
      setLongPressedNodeId(nodeId)
    }, 180)
  }

  function clearLongPress() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  return {
    nodes,
    draggedNodeId,
    hoveredNodeId,
    longPressedNodeId,
    submittedOrder: nodes.map((node) => node.id),
    moveNode,
    moveNodeById,
    startDrag,
    endDrag,
    setHoveredNodeId,
    armLongPress,
    clearLongPress,
  }
}
