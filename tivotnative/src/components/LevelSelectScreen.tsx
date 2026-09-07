import { Image } from 'expo-image'
import { ArrowLeft, CheckCircle2, Dice1, Map, Play } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { KAREL_LEVELS } from '../shared/catalog'
import type { KarelLevel } from '../shared/types'
import type { TabletMetrics } from './ui'
import { colors } from './ui'

const levelImages: Record<number, number> = {
  1: require('../../assets/lvl1icon.png'),
  2: require('../../assets/lvl2icon.png'),
  3: require('../../assets/lvl3icon.png'),
  4: require('../../assets/lvl4icon.png'),
}

interface LevelSelectScreenProps {
  metrics: TabletMetrics
  onBack: () => void
  onSelectLevel: (level: KarelLevel) => void
}

export function LevelSelectScreen({ metrics, onBack, onSelectLevel }: LevelSelectScreenProps) {
  const cardWidth = metrics.isLandscape ? '48.8%' : '100%'

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft color={colors.muted} size={20} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Mapas de aprendizaje</Text>
          <Text style={[styles.title, metrics.isTablet && styles.titleTablet]}>Selecciona un mapa</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.levelScroller} showsVerticalScrollIndicator={false}>
        <View style={[styles.levelGrid, !metrics.isLandscape && styles.levelGridPortrait]}>
          {KAREL_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              onPress={() => onSelectLevel(level)}
              style={({ pressed }) => [styles.levelCard, { width: cardWidth }, pressed && styles.pressed]}
            >
              <Image source={levelImages[level.id]} style={styles.levelImage} contentFit="contain" />
              <View style={styles.levelCopy}>
                <View style={styles.levelTopline}>
                  <Text style={styles.levelNumber}>Nivel {level.id}</Text>
                  <CheckCircle2 color={colors.accent} size={18} />
                </View>
                <Text style={styles.levelTitle}>{level.title.replace(/^Nivel \d+: /, '')}</Text>
                <Text style={styles.levelDescription}>{level.subtitle}</Text>
                <View style={styles.statusBadge}>
                  <Map color={colors.accentDark} size={14} />
                  <Text style={styles.statusBadgeText}>Disponible</Text>
                </View>
              </View>
            </Pressable>
          ))}

          <View style={[styles.arenaCard, { width: metrics.isLandscape ? '100%' : cardWidth }]}>
            <View style={styles.arenaHeader}>
              <Text style={styles.arenaEyebrow}>Arena libre // modo infinito</Text>
              <Text style={styles.arenaMeta}>Mapas dinamicos</Text>
            </View>
            <Text style={styles.arenaTitle}>Desafio procedural</Text>
            <Text style={styles.arenaDescription}>
              Algoritmos dinamicos en mundos generados al azar para probar tu logica sin limites.
            </Text>
            <View style={styles.arenaActions}>
              <View style={styles.arenaButton}>
                <Dice1 color={colors.accentStrong} size={15} />
                <Text style={styles.arenaButtonText}>Generador</Text>
              </View>
              <View style={styles.arenaButton}>
                <Text style={styles.arenaButtonText}>Sandbox</Text>
              </View>
              <View style={[styles.arenaButton, styles.arenaButtonPrimary]}>
                <Play color={colors.accentDark} size={15} fill={colors.accentDark} />
                <Text style={styles.arenaButtonPrimaryText}>Jugar</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 18,
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 23, 21, 0.72)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
  },
  titleTablet: {
    fontSize: 34,
  },
  levelScroller: {
    paddingBottom: 28,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  levelGridPortrait: {
    maxWidth: 720,
    alignSelf: 'center',
  },
  levelCard: {
    minHeight: 218,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.26)',
    borderRadius: 8,
    backgroundColor: 'rgba(7, 18, 15, 0.9)',
    flexDirection: 'row',
    gap: 14,
  },
  levelImage: {
    width: 112,
    height: 112,
    alignSelf: 'center',
  },
  levelCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  levelTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelNumber: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  levelTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  levelDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  statusBadge: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '900',
  },
  arenaCard: {
    minHeight: 160,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.42)',
    borderRadius: 8,
    backgroundColor: 'rgba(20, 17, 8, 0.86)',
    gap: 10,
  },
  arenaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  arenaEyebrow: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  arenaMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  arenaTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  arenaDescription: {
    maxWidth: 760,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  arenaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  arenaButton: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  arenaButtonPrimary: {
    borderColor: colors.warning,
    backgroundColor: colors.warning,
  },
  arenaButtonText: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '900',
  },
  arenaButtonPrimaryText: {
    color: '#120a02',
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
})
