import { Image } from 'expo-image'
import { Bot, MessageCircle, RotateCcw, Send, X, Zap } from 'lucide-react-native'
import { useRef } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { TivotAssistantChatMessage, TivotChatMessage, TivotChatSession } from '../shared/types'
import { IconButton, codeFont, colors } from './ui'
import { MarkdownText } from './MarkdownText'
import { ReorderableFlow } from './ReorderableFlow'
import tivotIcon from '../../assets/tivot_icon.png'

interface ChatPanelProps {
  session: TivotChatSession | null
  query: string
  isResponding: boolean
  onClose: () => void
  onQueryChange: (query: string) => void
  onSubmitMessage: () => Promise<void>
  onSelectQuickReply: (optionText: string) => Promise<void>
  onSubmitFlowOrder: (messageId: string, problemId: string, order: string[]) => Promise<void>
  onApplySuggestedCode: (suggestedCode: string[]) => void
  onResetConversation: () => void
}
export function ChatPanel({
  session, query, isResponding, onClose, onQueryChange, onSubmitMessage, onSelectQuickReply,
  onSubmitFlowOrder, onApplySuggestedCode, onResetConversation,
}: ChatPanelProps) {
  const scrollRef = useRef<ScrollView>(null)
  const latestAssistantId = [...(session?.messages ?? [])].reverse().find(message => message.role === 'assistant')?.id
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <MessageCircle size={22} color={colors.accentStrong} />
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Tutor IA</Text>
          <Text style={styles.title}>Tivot</Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton label="Reiniciar conversación de este nivel" disabled={isResponding} onPress={onResetConversation}>
            <RotateCcw size={17} color={colors.text} />
          </IconButton>
          <IconButton label="Minimizar chat" onPress={onClose}><X size={18} color={colors.text} /></IconButton>
        </View>
      </View>
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {session?.messages.map(message => (
          <ChatMessage key={message.id} message={message} isLatestAssistantMessage={message.id === latestAssistantId}
            isLoading={isResponding} onSelectQuickReply={option => void onSelectQuickReply(option)}
            onApplySuggestedCode={onApplySuggestedCode}
            onSubmitFlowOrder={(messageId, problemId, order) => void onSubmitFlowOrder(messageId, problemId, order)} />
        ))}
        {isResponding && <View style={styles.assistantRow}>
          <View style={styles.avatarFallback}><Bot color={colors.accentStrong} size={17} /></View>
          <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
            <ActivityIndicator color={colors.accentStrong} />
            <Text style={styles.loadingText}>Tivot está revisando tu pregunta</Text>
          </View>
        </View>}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput accessibilityLabel="Mensaje al tutor" value={query} onChangeText={onQueryChange} multiline
          placeholder="Pregunta sobre tu código..." placeholderTextColor={colors.faint} style={styles.input} />
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensaje" disabled={isResponding || !query.trim()}
          onPress={() => void onSubmitMessage()} style={[styles.sendButton, (isResponding || !query.trim()) && styles.disabled]}>
          {isResponding ? <ActivityIndicator color={colors.accentDark} /> : <Send size={18} color={colors.accentDark} />}
        </Pressable>
      </View>
    </View>
  )
}

interface ChatMessageProps {
  message: TivotChatMessage
  isLatestAssistantMessage: boolean
  isLoading: boolean
  onSelectQuickReply: (optionText: string) => void
  onSubmitFlowOrder: (messageId: string, problemId: string, submittedOrder: string[]) => void
  onApplySuggestedCode: (suggestedCode: string[]) => void
}

function ChatMessage({
  message,
  isLatestAssistantMessage,
  isLoading,
  onSelectQuickReply,
  onSubmitFlowOrder,
  onApplySuggestedCode,
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
        onApplySuggestedCode={onApplySuggestedCode}
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
  onApplySuggestedCode: (suggestedCode: string[]) => void
}

function AssistantMessage({ message, isLatestAssistantMessage, isLoading, onSelectQuickReply, onApplySuggestedCode }: AssistantMessageProps) {
  return (
    <View style={styles.assistantRow}>
      <Image source={tivotIcon} style={styles.avatar} contentFit="cover" />
      <View style={[styles.bubble, styles.assistantBubble]}>
        <MarkdownText text={message.payload.message} />
        {message.payload.suggestsCode && message.payload.suggestedCode && (
          <View style={styles.suggestedCodeCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedCodeScroll}>
              <Text accessibilityLabel="Código sugerido" style={styles.suggestedCodeText}>
                {message.payload.suggestedCode.join('\n')}
              </Text>
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Probar código"
              disabled={isLoading}
              onPress={() => onApplySuggestedCode(message.payload.suggestedCode ?? [])}
              style={({ pressed }) => [styles.tryCodeButton, isLoading && styles.disabled, pressed && styles.pressed]}
            >
              <Zap size={16} color={colors.accentDark} />
              <Text style={styles.tryCodeText}>Probar código</Text>
            </Pressable>
          </View>
        )}
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
  panel: { flex: 1, minHeight: 0, borderRadius: 8, backgroundColor: colors.panel, overflow: 'hidden' },
  header: { minHeight: 64, padding: 12, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kicker: { color: colors.accentStrong, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  messages: { flex: 1, minHeight: 0 },
  messagesContent: { padding: 14, gap: 14 },
  messageStack: { gap: 8 },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  userRow: { alignItems: 'flex-end' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.successBg },
  avatarFallback: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successBg },
  bubble: { maxWidth: '88%', padding: 11, borderWidth: 1, borderRadius: 8 },
  assistantBubble: { flex: 1, borderColor: colors.line, backgroundColor: colors.panelRaised },
  userBubble: { borderColor: '#84d7b7', backgroundColor: colors.successBg },
  userText: { color: colors.text },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  loadingText: { flex: 1, color: colors.muted, fontSize: 13 },
  suggestedCodeCard: { marginTop: 11, gap: 9 },
  suggestedCodeScroll: { maxWidth: '100%', padding: 11, borderWidth: 1, borderColor: '#84d7b7', borderRadius: 8, backgroundColor: '#edf9f3' },
  suggestedCodeText: { color: colors.text, fontFamily: codeFont, fontSize: 12, lineHeight: 19, paddingRight: 14 },
  tryCodeButton: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 13, borderWidth: 1, borderColor: '#34d399', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#6ee7b7' },
  tryCodeText: { color: colors.accentDark, fontSize: 12, fontWeight: '900' },
  quickReplyList: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickReplyChip: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#84d7b7', borderRadius: 7, justifyContent: 'center', backgroundColor: colors.successBg, maxWidth: '100%' },
  quickReplyText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  concept: { marginTop: 9, color: colors.accentStrong, fontSize: 11, fontWeight: '800' },
  composer: { margin: 10, minHeight: 56, padding: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: colors.panelRaised },
  input: { flex: 1, maxHeight: 120, minHeight: 40, color: colors.text, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
})
