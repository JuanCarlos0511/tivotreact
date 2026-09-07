import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, View, type ViewStyle } from 'react-native'

export const colors = {
  shell: '#060909',
  shellAlt: '#09100e',
  panel: '#07120f',
  panelRaised: '#101b17',
  panelSoft: '#111827',
  line: 'rgba(132, 147, 141, 0.28)',
  lineStrong: 'rgba(52, 211, 153, 0.72)',
  text: '#edf6f0',
  muted: '#c0c9c3',
  faint: '#748078',
  accent: '#2be58a',
  accentStrong: '#6ff0b3',
  accentDark: '#04110b',
  warning: '#fbbf24',
  error: '#fecaca',
  errorBg: 'rgba(127, 29, 29, 0.32)',
  successBg: 'rgba(16, 185, 129, 0.16)',
}

export interface TabletMetrics {
  width: number
  height: number
  isLandscape: boolean
  isTablet: boolean
  scale: number
}

export const createTabletMetrics = (width: number, height: number): TabletMetrics => {
  const shortestSide = Math.min(width, height)
  const isTablet = shortestSide >= 600
  const isLandscape = width > height
  const scale = isTablet ? Math.min(1.22, Math.max(1, shortestSide / 768)) : 1

  return { width, height, isLandscape, isTablet, scale }
}

interface ActionButtonProps {
  label: string
  icon?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function ActionButton({ label, icon, variant = 'secondary', disabled = false, onPress, style }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'primary' && styles.actionButtonPrimary,
        variant === 'ghost' && styles.actionButtonGhost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.actionButtonText, variant === 'primary' && styles.actionButtonPrimaryText]}>{label}</Text>
    </Pressable>
  )
}

interface TutorialCalloutProps {
  title: string
  body: string
  nextLabel?: string
  onNext: () => void
  onDismiss: () => void
  style?: StyleProp<ViewStyle>
}

export function TutorialCallout({ title, body, nextLabel = 'Siguiente', onNext, onDismiss, style }: TutorialCalloutProps) {
  return (
    <View style={[styles.tutorialCallout, style]}>
      <Text style={styles.tutorialTitle}>{title}</Text>
      <Text style={styles.tutorialBody}>{body}</Text>
      <View style={styles.tutorialActions}>
        <Pressable onPress={onDismiss} style={styles.tutorialSkipButton}>
          <Text style={styles.tutorialSkipText}>Omitir</Text>
        </Pressable>
        <Pressable onPress={onNext} style={styles.tutorialNextButton}>
          <Text style={styles.tutorialNextText}>{nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function MarkdownText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const normalizedText = text
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')

  return <Text style={[styles.markdownText, style]}>{normalizedText}</Text>
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(132, 147, 141, 0.28)',
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonPrimary: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  actionButtonGhost: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  actionButtonPrimaryText: {
    color: colors.accentDark,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  tutorialCallout: {
    position: 'absolute',
    zIndex: 50,
    width: 320,
    maxWidth: '92%',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    backgroundColor: 'rgba(4, 17, 13, 0.98)',
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  tutorialTitle: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tutorialBody: {
    marginTop: 6,
    color: '#e9fff4',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  tutorialActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tutorialSkipButton: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(132, 147, 141, 0.36)',
    borderRadius: 7,
    justifyContent: 'center',
  },
  tutorialNextButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 7,
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  tutorialSkipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '900',
  },
  tutorialNextText: {
    color: colors.accentDark,
    fontSize: 11,
    fontWeight: '900',
  },
  markdownText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
})
