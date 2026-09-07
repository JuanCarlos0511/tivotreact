import { Image } from 'expo-image'
import { Bot, Play } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { TabletMetrics } from './ui'
import { colors } from './ui'

const tivotLogo = require('../../assets/tivot_logo_clear.png')
const heroImage = require('../../assets/hero.png')

interface StartScreenProps {
  metrics: TabletMetrics
  onStart: () => void
}

export function StartScreen({ metrics, onStart }: StartScreenProps) {
  const titleSize = metrics.isTablet ? 46 * metrics.scale : 34

  return (
    <View style={[styles.screen, metrics.isLandscape && styles.screenLandscape]}>
      <View style={[styles.heroPanel, metrics.isLandscape && styles.heroPanelLandscape]}>
        <Image source={heroImage} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroOverlay} />
        <View style={styles.orbit}>
          <Bot color={colors.accentStrong} size={metrics.isTablet ? 82 : 64} strokeWidth={1.6} />
        </View>
      </View>

      <View style={[styles.copyPanel, metrics.isLandscape && styles.copyPanelLandscape]}>
        <Image source={tivotLogo} style={styles.logo} contentFit="contain" />
        <Text style={[styles.title, { fontSize: titleSize }]}>TIVOT KAREL</Text>
        <Text style={styles.subtitle}>
          Aprende programacion con mapas, pasos claros y un tutor que acompana cada reto.
        </Text>
        <Pressable onPress={onStart} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
          <Play color={colors.accentDark} size={20} fill={colors.accentDark} />
          <Text style={styles.startButtonText}>Comenzar</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 22,
  },
  screenLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  heroPanel: {
    minHeight: 280,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  heroPanelLandscape: {
    flex: 1.08,
    height: '78%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.44)',
  },
  orbit: {
    position: 'absolute',
    alignSelf: 'center',
    top: '36%',
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 1,
    borderColor: 'rgba(111, 240, 179, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 12, 12, 0.72)',
  },
  copyPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  copyPanelLandscape: {
    flex: 0.92,
    alignItems: 'flex-start',
    paddingLeft: 18,
  },
  logo: {
    width: 170,
    height: 62,
  },
  title: {
    color: colors.text,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    maxWidth: 520,
    color: colors.muted,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  startButton: {
    marginTop: 10,
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.accent,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 5,
  },
  startButtonText: {
    color: colors.accentDark,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
})
