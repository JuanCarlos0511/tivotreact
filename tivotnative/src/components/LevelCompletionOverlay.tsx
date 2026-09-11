import { ArrowRight, Home, RotateCcw, Save, X } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from './ui'

const CONFETTI_COLORS = ['#10b981', '#fbbf24', '#38bdf8', '#f472b6', '#8b5cf6']

export function LevelCompletionOverlay({ visible, challenge, onPrimary, onSecondary, onClose }: {
  visible: boolean; challenge: boolean; onPrimary: () => void; onSecondary: () => void; onClose: () => void
}) {
  const progress = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!visible) { progress.setValue(0); return }
    const animation = Animated.timing(progress, { toValue: 1, duration: 1500, useNativeDriver: true })
    animation.start()
    return () => animation.stop()
  }, [progress, visible])
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait']}>
      <View accessibilityViewIsModal accessibilityLabel="Nivel completado" style={styles.backdrop}>
        <Pressable accessibilityLabel="Cerrar victoria" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: 26 }, (_, index) => (
            <Animated.View key={index} style={[styles.confetti, {
              left: `${4 + ((index * 37) % 92)}%`, backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-80 - (index % 5) * 20, 760] }) }, { rotate: `${index * 29}deg` }],
              opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0] }),
            }]} />
          ))}
        </View>
        <View style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar victoria" onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}><X size={19} color={colors.muted} /></Pressable>
          <View style={styles.medal}><Text style={styles.medalText}>★</Text></View>
          <Text style={styles.eyebrow}>{challenge ? 'DESAFÍO SUPERADO' : 'OBJETIVO CUMPLIDO'}</Text>
          <Text accessibilityRole="header" style={styles.title}>¡Nivel completado!</Text>
          <Text style={styles.copy}>Llegaste a la meta y completaste todas las condiciones.</Text>
          <View style={styles.actions}>
            <OverlayButton primary label={challenge ? 'Jugar nuevo nivel' : 'Siguiente nivel'} onPress={onPrimary}
              icon={challenge ? <RotateCcw size={17} color="#ffffff" /> : <ArrowRight size={17} color="#ffffff" />} />
            <OverlayButton label={challenge ? 'Guardar mi partida' : 'Volver al menú'} onPress={onSecondary}
              icon={challenge ? <Save size={17} color="#7c2d12" /> : <Home size={17} color="#7c2d12" />} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

export function ChallengeExitDialog({ visible, onCancel, onExit, onSaveAndExit }: {
  visible: boolean; onCancel: () => void; onExit: () => void; onSaveAndExit: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} supportedOrientations={['portrait']}>
      <View accessibilityViewIsModal accessibilityLabel="Guardar partida antes de salir" style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.bag}>🎒</Text><Text style={styles.eyebrow}>PARTIDA DE DESAFÍO</Text>
          <Text accessibilityRole="header" style={styles.title}>¿Deseas guardar antes de salir?</Text>
          <Text style={styles.copy}>Se guardarán el mapa, la posición del robot, las fichas y tu código.</Text>
          <View style={styles.exitActions}>
            <OverlayButton primary label="Guardar y salir" icon={<Save size={16} color="#ffffff" />} onPress={onSaveAndExit} />
            <OverlayButton danger label="Salir sin guardar" onPress={onExit} />
            <OverlayButton label="Cancelar" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function OverlayButton({ label, icon, onPress, primary = false, danger = false }: {
  label: string; icon?: React.ReactNode; onPress: () => void; primary?: boolean; danger?: boolean
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, primary && styles.primary, danger && styles.danger, pressed && styles.pressed]}>{icon}<Text style={[styles.buttonText, primary && styles.primaryText, danger && styles.dangerText]}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 30, 26, 0.58)' },
  confetti: { position: 'absolute', top: 0, width: 10, height: 18, borderRadius: 3 },
  card: { width: '100%', maxWidth: 470, padding: 26, borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 18, backgroundColor: '#fffcf7', alignItems: 'center', gap: 11, shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
  close: { position: 'absolute', zIndex: 3, top: 12, right: 12, width: 38, height: 38, borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  medal: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fbbf24', alignItems: 'center', justifyContent: 'center' },
  medalText: { fontSize: 32, color: '#ffffff', fontWeight: '900' }, bag: { fontSize: 40 },
  eyebrow: { color: colors.accentStrong, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 27, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 8 },
  actions: { width: '100%', flexDirection: 'row', gap: 10 },
  exitActions: { width: '100%', marginTop: 8, flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  button: { flex: 1, minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: '#f59e0b', borderRadius: 10, backgroundColor: '#fef3c7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primary: { borderColor: '#047857', backgroundColor: '#08734f' }, danger: { borderColor: '#fecaca', backgroundColor: '#fff0ee' },
  buttonText: { color: '#7c2d12', fontSize: 12, fontWeight: '900', textAlign: 'center' }, primaryText: { color: '#ffffff' }, dangerText: { color: colors.error }, pressed: { opacity: 0.72 },
})
