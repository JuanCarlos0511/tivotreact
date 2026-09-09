import { Image } from 'expo-image'
import { Play } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ActionButton, colors, type TabletMetrics } from './ui'

const tivotIcon = require('../../assets/tivot_icon.png')

export function StartScreen({ onStart }: { metrics: TabletMetrics; onStart: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.orbit}><Image source={tivotIcon} style={styles.icon} contentFit="contain" /></View>
      <Text accessibilityRole="header" style={styles.title}>TIVOT KAREL</Text>
      <ActionButton label="Iniciar" variant="primary" onPress={onStart}
        icon={<Play size={18} color={colors.accentDark} />} style={styles.start} />
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  orbit: { width: 148, height: 148, marginBottom: 24, borderWidth: 1, borderColor: '#84d7b7', borderRadius: 74, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelRaised },
  icon: { width: 112, height: 112 },
  title: { color: colors.text, fontSize: 48, fontWeight: '900', textAlign: 'center', marginTop: 10 },
  start: { marginTop: 34, minHeight: 52, width: '100%', maxWidth: 312 },
})
