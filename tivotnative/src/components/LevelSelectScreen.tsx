import { ArrowLeft, Play } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { createKarelChallenge, KAREL_LEVELS } from '../shared/catalog'
import type { KarelLevel } from '../shared/types'
import { IconButton, colors, type TabletMetrics } from './ui'
import { LinearGradient } from 'expo-linear-gradient'

export function LevelSelectScreen({ onBack, onSelectLevel, onViewSavedGames }: {
  metrics: TabletMetrics; onBack: () => void; onSelectLevel: (level: KarelLevel) => void; onViewSavedGames: () => void
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconButton label="Volver" onPress={onBack}><ArrowLeft size={18} color={colors.muted} /></IconButton>
          <Text accessibilityRole="header" style={styles.title}>Seleccionar nivel</Text>
        </View>
        <View style={styles.grid}>
          {[0, 2].map(startIndex => (
            <View key={startIndex} style={styles.levelRow}>
              {KAREL_LEVELS.slice(startIndex, startIndex + 2).map(level => (
                <Pressable key={level.id} accessibilityRole="button" accessibilityLabel={'Nivel ' + level.id + ': ' + level.title.replace(/^Nivel \d+: /, '')}
                  onPress={() => onSelectLevel(level)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                  <Text style={styles.number}>Nivel {level.id}</Text>
                  <Text style={styles.cardTitle}>{level.title.replace(/^Nivel \d+: /, '')}</Text>
                  <Text style={styles.description}>{level.subtitle}</Text>
                  <LinearGradient colors={['#08734f', '#08734f']} style={styles.startAction}>
                    <Play size={13} color="#ffffff" /><Text style={styles.startText}>Iniciar</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Nivel 5: Desafío"
          onPress={() => onSelectLevel(createKarelChallenge())}
          style={({ pressed }) => [styles.challenge, pressed && styles.pressed]}>
          <Text style={styles.number}>Nivel 5</Text>
          <Text style={styles.challengeTitle}>Desafío</Text>
          <Text style={styles.description}>Enfréntate a mapas dinámicos y pon a prueba tu lógica resolviendo retos de programación con dificultad variable.</Text>
          <View style={styles.challengeActions}>
            <LinearGradient colors={['#08734f', '#08734f']} style={[styles.startAction, styles.challengeAction]}>
              <Play size={14} color="#ffffff" /><Text style={styles.startText}>Iniciar</Text>
            </LinearGradient>
            <Pressable accessibilityRole="button" onPress={event => { event.stopPropagation(); onViewSavedGames() }}
              style={({ pressed }) => [styles.savedButton, pressed && styles.pressed]}>
              <Text style={styles.savedButtonText}>Ver mis partidas guardadas</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 18 },
  content: { width: '100%', maxWidth: 784, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  title: { flex: 1, minWidth: 0, fontSize: 26, fontWeight: '800', color: colors.text },
  savedButton: { minHeight: 40, paddingHorizontal: 13, borderWidth: 1, borderColor: '#9cebc8', borderRadius: 8, backgroundColor: '#effdf7', alignItems: 'center', justifyContent: 'center' },
  savedButtonText: { color: colors.accentStrong, fontSize: 11, fontWeight: '900' },
  grid: { gap: 12 },
  levelRow: { width: '100%', flexDirection: 'row', gap: 12 },
  card: { flex: 1, minWidth: 0, minHeight: 198, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel, alignItems: 'flex-start' },
  number: { color: colors.accentStrong, fontSize: 12, fontWeight: '900' },
  cardTitle: { marginTop: 14, fontSize: 17, lineHeight: 21, fontWeight: '800', color: colors.text },
  description: { marginTop: 8, fontSize: 12, lineHeight: 17, color: colors.muted },
  startAction: { alignSelf: 'stretch', minHeight: 36, marginTop: 'auto', borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  startText: { fontSize: 12, fontWeight: '900', color: '#ffffff' },
  challenge: { minHeight: 150, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel, gap: 8 },
  challengeTitle: { color: colors.accentStrong, fontSize: 18, fontWeight: '800' },
  challengeAction: { alignSelf: 'flex-start', minWidth: 120, paddingHorizontal: 16 },
  challengeActions: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pressed: { borderColor: colors.accentStrong },
})
