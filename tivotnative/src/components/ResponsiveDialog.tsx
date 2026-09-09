import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from './ui'

export function ResponsiveDialog({ visible, onClose, children, style, placement = 'center', label }: {
  visible: boolean; onClose: () => void; children: ReactNode; style?: StyleProp<ViewStyle>
  placement?: 'center' | 'right' | 'bottom'; label: string
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable accessibilityLabel="Cerrar ventana" onPress={onClose} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal accessibilityLabel={label}
            style={[styles.dialog, placement === 'right' && styles.right, placement === 'bottom' && styles.bottom, style]}>
            {children}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.backdrop },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 460, maxHeight: '92%', padding: 18, borderRadius: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  right: { alignSelf: 'flex-end', maxWidth: 440, height: '100%', maxHeight: '100%', padding: 0 },
  bottom: { marginTop: 'auto', maxWidth: 540, padding: 0 },
})
