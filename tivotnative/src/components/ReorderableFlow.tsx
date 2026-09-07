import { ArrowDown, ArrowUp, Lock, Send } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFlowChallenge } from '../features/chat/hooks'
import type { FlowSubmissionState, TivotInteractiveFlowPayload } from '../shared/types'
import { MarkdownText, colors } from './ui'

interface ReorderableFlowProps {
  payload: TivotInteractiveFlowPayload
  submission: FlowSubmissionState | null
  onSubmit: (submittedOrder: string[]) => void
}

export function ReorderableFlow({ payload, submission, onSubmit }: ReorderableFlowProps) {
  const isLocked = submission?.status === 'LOCKED'
  const isSubmitting = submission?.status === 'SUBMITTING'
  const challenge = useFlowChallenge({
    initialNodes: payload.flow_data.nodes,
    resetKey: payload.problem_id,
    isDisabled: isLocked || isSubmitting,
  })

  return (
    <View style={styles.flowCard}>
      <Text style={styles.flowInstruction}>{payload.flow_data.instruction}</Text>
      <View style={styles.nodeList}>
        {challenge.nodes.map((node, index) => (
          <View key={node.id} style={styles.nodeRow}>
            <View style={styles.nodeIndex}>
              <Text style={styles.nodeIndexText}>{index + 1}</Text>
            </View>
            <Text style={styles.nodeLabel}>{node.label}</Text>
            <View style={styles.nodeActions}>
              <Pressable
                disabled={index === 0 || isLocked || isSubmitting}
                onPress={() => challenge.moveNode(index, index - 1)}
                style={[styles.nodeMoveButton, (index === 0 || isLocked || isSubmitting) && styles.disabled]}
              >
                <ArrowUp color={colors.accentStrong} size={15} />
              </Pressable>
              <Pressable
                disabled={index === challenge.nodes.length - 1 || isLocked || isSubmitting}
                onPress={() => challenge.moveNode(index, index + 1)}
                style={[
                  styles.nodeMoveButton,
                  (index === challenge.nodes.length - 1 || isLocked || isSubmitting) && styles.disabled,
                ]}
              >
                <ArrowDown color={colors.accentStrong} size={15} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        disabled={isLocked || isSubmitting}
        onPress={() => onSubmit(challenge.submittedOrder)}
        style={[styles.submitButton, (isLocked || isSubmitting) && styles.disabled]}
      >
        {isLocked ? <Lock color={colors.accentDark} size={16} /> : <Send color={colors.accentDark} size={16} />}
        <Text style={styles.submitText}>
          {isSubmitting ? 'Revisando' : isLocked ? 'Enviado' : 'Revisar orden'}
        </Text>
      </Pressable>

      {submission?.feedback && (
        <View style={styles.feedback}>
          <MarkdownText text={submission.feedback.message} style={styles.feedbackText} />
          <Text style={styles.feedbackMeta}>{submission.llmInvoked ? 'Pista de Tivot' : 'Revisado al instante'}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  flowCard: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(111, 240, 179, 0.34)',
    borderRadius: 8,
    backgroundColor: 'rgba(6, 78, 59, 0.14)',
    gap: 10,
  },
  flowInstruction: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  nodeList: {
    gap: 8,
  },
  nodeRow: {
    minHeight: 48,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(111, 240, 179, 0.28)',
    borderRadius: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  nodeIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeIndexText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '900',
  },
  nodeLabel: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  nodeActions: {
    flexDirection: 'row',
    gap: 5,
  },
  nodeMoveButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: 'rgba(111, 240, 179, 0.28)',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '900',
  },
  feedback: {
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackMeta: {
    marginTop: 6,
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.48,
  },
})
