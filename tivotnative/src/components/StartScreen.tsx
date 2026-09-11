import { Image } from 'expo-image'
import { Play } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ActionButton, colors, type TabletMetrics } from './ui'
import tivotIcon from '../../assets/tivot_icon.png'

export function StartScreen({ onStart }: { metrics: TabletMetrics; onStart: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.orbit}>
        <View style={styles.orbitSurface}>
          {[24, 48, 72, 96, 120].map(offset => (
            <View key={'vertical-' + offset} style={[styles.orbitLineVertical, { left: offset }]} />
          ))}
          {[24, 48, 72, 96, 120].map(offset => (
            <View key={'horizontal-' + offset} style={[styles.orbitLineHorizontal, { top: offset }]} />
          ))}
          <Image source={tivotIcon} style={styles.icon} contentFit="contain" />
        </View>
      </View>
      <Text accessibilityRole="header" style={styles.title}>TIVOT KAREL</Text>
      <ActionButton label="Iniciar" variant="primary" onPress={onStart}
        icon={<Play size={18} color={colors.accentDark} />} style={styles.start} />
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  orbit: { width: 148, height: 148, marginBottom: 24, borderRadius: 74, shadowColor: '#10b981', shadowOpacity: 0.26, shadowRadius: 23, shadowOffset: { width: 0, height: 0 }, elevation: 9 },
  orbitSurface: { flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: '#84d7b7', borderRadius: 74, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelRaised },
  orbitLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(16, 185, 129, 0.18)' },
  orbitLineHorizontal: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(16, 185, 129, 0.18)' },
  icon: { zIndex: 1, width: 112, height: 112 },
  title: { color: colors.text, fontSize: 48, fontWeight: '900', textAlign: 'center', marginTop: 10, textShadowColor: 'rgba(16, 185, 129, 0.32)', textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  start: { marginTop: 34, minHeight: 52, width: '100%', maxWidth: 312, shadowColor: '#10b981', shadowOpacity: 0.34, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
})
