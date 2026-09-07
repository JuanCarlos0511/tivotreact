import { Image } from 'expo-image'
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { TivotAssistantChatMessage, TivotChatMessage, TivotChatSession } from '../shared/types'
import type { TabletMetrics } from './ui'
import { MarkdownText, TutorialCallout, colors } from './ui'
import { ReorderableFlow } from './ReorderableFlow'

const tivotIcon = require('../../assets/tivot_icon.png')

interface ChatPanelProps {
  metrics: TabletMetrics
  session: TivotChatSession | null
  query: string
  isResponding: boolean
  tutorialActive: boolean
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSelectQuickReply: (optionText: string) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => Promise<void>
  onTutorialNext: () => void
  onTutorialDismiss: () => void
}

export function ChatPanel({
  metrics,
  session,
  query,
  isResponding,
  tutorialActive,
  onQueryChange,
  onSubmitMessage,
  onSelectQuickReply,
  onSubmitFlowOrder,
  onTutorialNext,
  onTutorialDismiss,
}: ChatPanelProps) {
  const scrollRef = useRef<ScrollView | null>(null)
  const latestAssistantMessageId = [...(session?.messages ?? [])].reverse().find((message) => message.role === 'assistant')?.id
  const canSend = query.trim().length > 0 && !isResponding

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [isResponding, session?.messages.length])

  return (
    <View style={[styles.panel, tutorialActive && styles.chatSpotlight]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, tutorialActive && styles.neonIcon]}>
          <MessageCircle color={colors.accentStrong} size={22} />
          {tutorialActive && <View style={styles.pulseDot} />}
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Tutor IA</Text>
          <Text style={styles.title}>Tivot Karel</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {session?.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLatestAssistantMessage={message.id === latestAssistantMessageId}
            isLoading={isResponding}
            onSelectQuickReply={(optionText) => void onSelectQuickReply(optionText)}
            onSubmitFlowOrder={(messageId, problemId, order) => void onSubmitFlowOrder(messageId, problemId, order)}
          />
        ))}

        {isResponding && (
          <View style={styles.assistantRow}>
            <View style={styles.avatarFallback}>
              <Bot color={colors.accentStrong} size={17} />
            </View>
            <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
              <ActivityIndicator color={colors.accentStrong} size="small" />
              <Text style={styles.loadingText}>Tivot esta revisando tu pregunta</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          multiline
          maxLength={1200}
          placeholder="Pregunta sobre tu codigo..."
          placeholderTextColor={colors.faint}
          style={styles.input}
        />
        <Pressable
          disabled={!canSend}
          onPress={() => void onSubmitMessage()}
          style={[styles.sendButton, !canSend && styles.disabled]}
        >
          {isResponding ? <Loader2 color={colors.accentDark} size={18} /> : <Send color={colors.accentDark} size={18} />}
        </Pressable>
      </View>

      {tutorialActive && (
        <TutorialCallout
          title="Tutorial inicial"
          body="Conoce a Tivot: sera tu guia de apoyo para aprender a programar paso a paso durante este reto."
          onNext={onTutorialNext}
          onDismiss={onTutorialDismiss}
          style={[styles.chatTutorial, !metrics.isLandscape && styles.chatTutorialPortrait]}
        />
      )}
    </View>
  )
}

interface ChatMessageProps {
  message: TivotChatMessage
  isLatestAssistantMessage: boolean
  isLoading: boolean
  onSelectQuickReply: (optionText: string) => void
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => void
}

function ChatMessage({
  message,
  isLatestAssistantMessage,
  isLoading,
  onSelectQuickReply,
  onSubmitFlowOrder,
}: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={[styles.bubble, styles.userBubble]}>
          <MarkdownText text={message.content} style={styles.userText} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.messageStack}>
      <AssistantMessage
        message={message}
        isLatestAssistantMessage={isLatestAssistantMessage}
        isLoading={isLoading}
        onSelectQuickReply={onSelectQuickReply}
      />
      {message.payload.type === 'interactive_flow' &&
        (() => {
          const flowPayload = message.payload

          return (
            <ReorderableFlow
              payload={flowPayload}
              submission={message.submission}
              onSubmit={(submittedOrder) => onSubmitFlowOrder(message.id, flowPayload.problem_id, submittedOrder)}
            />
          )
        })()}
    </View>
  )
}

interface AssistantMessageProps {
  message: TivotAssistantChatMessage
  isLatestAssistantMessage: boolean
  isLoading: boolean
  onSelectQuickReply: (optionText: string) => void
}

function AssistantMessage({ message, isLatestAssistantMessage, isLoading, onSelectQuickReply }: AssistantMessageProps) {
  return (
    <View style={styles.assistantRow}>
      <Image source={tivotIcon} style={styles.avatar} contentFit="cover" />
      <View style={[styles.bubble, styles.assistantBubble]}>
        <MarkdownText text={message.payload.message} />
        {message.payload.options && (
          <View style={styles.quickReplyList}>
            {message.payload.options.map((option) => {
              const isDisabled = !isLatestAssistantMessage || isLoading

              return (
                <Pressable
                  key={option}
                  disabled={isDisabled}
                  onPress={() => onSelectQuickReply(option)}
                  style={[styles.quickReplyChip, isDisabled && styles.disabled]}
                >
                  <Text style={styles.quickReplyText}>{option}</Text>
                </Pressable>
              )
            })}
          </View>
        )}
        <Text style={styles.concept}>{message.payload.metadata.concept}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderRadius: 8,
    backgroundColor: 'rgba(7, 12, 18, 0.96)',
    overflow: 'hidden',
  },
  chatSpotlight: {
    zIndex: 30,
    borderColor: colors.lineStrong,
    shadowColor: colors.accent,
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 8,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31, 41, 55, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 17, 13, 0.96)',
  },
  neonIcon: {
    borderColor: colors.lineStrong,
    shadowColor: colors.accent,
    shadowOpacity: 0.62,
    shadowRadius: 18,
    elevation: 8,
  },
  pulseDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  messages: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    padding: 14,
    gap: 14,
  },
  messageStack: {
    gap: 8,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  bubble: {
    maxWidth: '88%',
    padding: 11,
    borderWidth: 1,
    borderRadius: 8,
  },
  assistantBubble: {
    flex: 1,
    borderColor: 'rgba(72, 80, 88, 0.9)',
    backgroundColor: 'rgba(30, 31, 35, 0.92)',
  },
  userBubble: {
    borderColor: 'rgba(16, 185, 129, 0.54)',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  userText: {
    color: '#ecfdf5',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  loadingText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  quickReplyList: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickReplyChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.34)',
    borderRadius: 7,
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 78, 59, 0.24)',
  },
  quickReplyText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '900',
  },
  concept: {
    marginTop: 9,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  composer: {
    margin: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: 'rgba(20, 24, 28, 0.82)',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  chatTutorial: {
    top: 62,
    right: 16,
  },
  chatTutorialPortrait: {
    left: 16,
    right: 16,
  },
  disabled: {
    opacity: 0.5,
  },
})
