import { LinearGradient } from 'expo-linear-gradient'
import type { ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'

export const colors = {
  shell: '#f1ece3',
  shellAlt: '#f7f2ea',
  panel: '#fffcf7',
  panelRaised: '#ffffff',
  panelSoft: '#f7f2ea',
  line: '#d9d8cd',
  lineStrong: '#08734f',
  text: '#202d29',
  muted: '#5e6a64',
  faint: '#89938d',
  accent: '#2be58a',
  accentStrong: '#08734f',
  accentDark: '#06110c',
  blue: '#166585',
  warning: '#fbbf24',
  warningInk: '#8c510c',
  error: '#aa2323',
  errorBg: '#fff0ee',
  successBg: '#e8faf2',
  backdrop: 'rgba(28, 30, 29, 0.38)',
  mobileShell: '#f7f8f6',
  mobileLine: '#dfe7e2',
}
export const codeFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

export interface TabletMetrics {
  width: number
  height: number
  isLandscape: boolean
  isTablet: boolean
}
export const createTabletMetrics = (width: number, height: number): TabletMetrics => ({
  width, height, isLandscape: width > height, isTablet: Math.min(width, height) >= 600,
})

interface ActionButtonProps {
  label: string
  icon?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
}
export function ActionButton({ label, icon, variant = 'secondary', disabled = false, onPress, style, testID }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action, variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost, style,
        disabled && styles.disabled, pressed && !disabled && styles.pressed,
      ]}
    >
      {variant === 'primary' && <LinearGradient colors={['#7cf5bc', '#10b981']} style={styles.fill} />}
      {icon}
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  )
}

export function IconButton({ label, children, onPress, disabled = false, style }: {
  label: string; children: ReactNode; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, style, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >{children}</Pressable>
  )
}

const styles = StyleSheet.create({
  action: {
    minHeight: 44, minWidth: 0, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.line, borderRadius: 8,
    backgroundColor: colors.panelRaised, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 7, overflow: 'hidden',
  },
  primary: { borderColor: '#34d399', backgroundColor: '#2dd4bf' },
  ghost: { backgroundColor: 'transparent' },
  fill: { ...StyleSheet.absoluteFill, borderRadius: 7 },
  label: { color: colors.text, fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  primaryLabel: { color: colors.accentDark },
  icon: {
    width: 40, height: 40, borderWidth: 1, borderColor: colors.line,
    borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelRaised,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
})
