import { ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import { codeFont, colors } from './ui'

interface MarkdownMessageProps {
  text: string
  style?: StyleProp<TextStyle>
}

type MarkdownSegment =
  | { kind: 'text'; content: string }
  | { kind: 'code'; content: string; language: string | null }

const splitMarkdownSegments = (text: string): MarkdownSegment[] => {
  const segments: MarkdownSegment[] = []
  const fencePattern = /```(\w+)?\n?([\s\S]*?)```/g
  let cursor = 0
  let match = fencePattern.exec(text)

  while (match) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', content: text.slice(cursor, match.index) })
    }

    segments.push({
      kind: 'code',
      language: match[1] ?? null,
      content: match[2]?.trimEnd() ?? '',
    })

    cursor = match.index + match[0].length
    match = fencePattern.exec(text)
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', content: text.slice(cursor) })
  }

  return segments.length > 0 ? segments : [{ kind: 'text', content: text }]
}

const stripInlineFormatting = (text: string): string =>
  text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')

export function MarkdownText({ text, style }: MarkdownMessageProps) {
  return (
    <View style={styles.content}>
      {splitMarkdownSegments(text).map((segment, segmentIndex) => {
        if (segment.kind === 'code') {
          return (
            <ScrollView horizontal key={`code-${segmentIndex}`} style={styles.codeBlock}>
              <Text selectable style={styles.codeText}>{segment.content}</Text>
            </ScrollView>
          )
        }

        return segment.content
          .split(/\n{2,}/)
          .filter((paragraph) => paragraph.trim().length > 0)
          .map((paragraph, paragraphIndex) => (
            <Text selectable style={[styles.paragraph, style]} key={`paragraph-${segmentIndex}-${paragraphIndex}`}>
              {stripInlineFormatting(paragraph.trim())}
            </Text>
          ))
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 8, minWidth: 0 },
  paragraph: { color: colors.text, fontSize: 14, lineHeight: 21 },
  codeBlock: { backgroundColor: colors.panelSoft, borderRadius: 7, borderWidth: 1, borderColor: colors.line },
  codeText: { padding: 10, color: colors.text, fontFamily: codeFont, fontSize: 12, lineHeight: 19 },
})
