import { ArrowLeft, Play } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { createKarelChallenge, KAREL_LEVELS } from '../shared/catalog'
import type { KarelLevel } from '../shared/types'
import { ActionButton, IconButton, colors, type TabletMetrics } from './ui'
import { LinearGradient } from 'expo-linear-gradient'

export function LevelSelectScreen({ metrics, onBack, onSelectLevel }: {
  metrics: TabletMetrics; onBack: () => void; onSelectLevel: (level: KarelLevel) => void
}) {
  const cardWidth = (Math.min(metrics.width, 820) - 48) / 2
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconButton label="Volver" onPress={onBack}><ArrowLeft size={18} color={colors.muted} /></IconButton>
          <Text accessibilityRole="header" style={styles.title}>Seleccionar nivel</Text>
        </View>
        <View style={styles.grid}>
          {KAREL_LEVELS.map(level => (
            <Pressable key={level.id} accessibilityRole="button" accessibilityLabel={'Nivel ' + level.id + ': ' + level.title.replace(/^Nivel \d+: /, '')}
              onPress={() => onSelectLevel(level)} style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}>
              <Text style={styles.number}>Nivel {level.id}</Text>
              <Text style={styles.cardTitle}>{level.title.replace(/^Nivel \d+: /, '')}</Text>
              <Text style={styles.description}>{level.subtitle}</Text>
              <LinearGradient colors={['#7cf5bc', '#10b981']} style={styles.startAction}>
                <Play size={13} color={colors.accentDark} /><Text style={styles.startText}>Iniciar</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
        <View style={styles.challenge}>
          <Text style={styles.challengeTitle}>Desafío</Text>
          <Text style={styles.description}>Enfréntate a mapas dinámicos y pon a prueba tu lógica resolviendo retos de programación con dificultad variable.</Text>
          <ActionButton label="Iniciar desafío" variant="primary" icon={<Play size={14} color={colors.accentDark} />}
            onPress={() => onSelectLevel(createKarelChallenge())} style={styles.challengeAction} />
        </View>
      </View>
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 18 },
  content: { width: '100%', maxWidth: 784, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  title: { flex: 1, minWidth: 0, fontSize: 26, fontWeight: '800', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 198, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel, alignItems: 'flex-start' },
  number: { color: colors.accentStrong, fontSize: 12, fontWeight: '900' },
  cardTitle: { marginTop: 14, fontSize: 17, lineHeight: 21, fontWeight: '800', color: colors.text },
  description: { marginTop: 8, fontSize: 12, lineHeight: 17, color: colors.muted },
  startAction: { alignSelf: 'stretch', minHeight: 36, marginTop: 'auto', borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  startText: { fontSize: 11, fontWeight: '800', color: colors.accentDark },
  challenge: { minHeight: 160, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel, gap: 8 },
  challengeTitle: { color: colors.accentStrong, fontSize: 18, fontWeight: '800' },
  challengeAction: { alignSelf: 'flex-start' },
  pressed: { borderColor: colors.accentStrong },
})
