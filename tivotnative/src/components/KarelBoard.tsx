import { Bot } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import type { KarelWorldState } from '../shared/types'
import type { TabletMetrics } from './ui'
import { colors } from './ui'

interface KarelBoardProps {
  metrics: TabletMetrics
  world: KarelWorldState
}

const STREETS = [8, 7, 6, 5, 4, 3, 2, 1] as const
const AVENUES = [1, 2, 3, 4, 5, 6, 7, 8] as const

const DIRECTION_SYMBOL = {
  NORTE: '^',
  SUR: 'v',
  ESTE: '>',
  OESTE: '<',
} as const

export function KarelBoard({ metrics, world }: KarelBoardProps) {
  const boardSize = Math.min(metrics.width * (metrics.isLandscape ? 0.38 : 0.68), metrics.height * 0.45, 430)
  const getBeeper = (street: number, avenue: number) =>
    world.beepers.find((beeper) => beeper.street === street && beeper.avenue === avenue)

  return (
    <View style={styles.panel}>
      <View style={styles.meta}>
        <Text style={styles.metaText}>Mundo 8x8</Text>
        <Text style={styles.bagText}>Mochila: {world.bagBeepers}</Text>
      </View>

      <View style={[styles.boardShell, { width: boardSize + 24 }]}>
        <View style={[styles.streetLabels, { height: boardSize }]}>
          {STREETS.map((street) => (
            <Text key={street} style={styles.axisLabel}>
              {street}
            </Text>
          ))}
        </View>

        <View style={[styles.grid, { width: boardSize, height: boardSize }]}>
          {STREETS.map((street) => (
            <View key={street} style={styles.row}>
              {AVENUES.map((avenue) => {
                const hasKarel = world.karelPosition.street === street && world.karelPosition.avenue === avenue
                const beeper = getBeeper(street, avenue)

                return (
                  <View key={`${street}-${avenue}`} style={styles.cell}>
                    {beeper && (
                      <View style={styles.beeper}>
                        <Text style={styles.beeperText}>{beeper.count}</Text>
                      </View>
                    )}
                    {hasKarel && (
                      <View style={styles.karelToken}>
                        <Bot color={colors.text} size={18} strokeWidth={1.8} />
                        <Text style={styles.directionText}>{DIRECTION_SYMBOL[world.karelDirection]}</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>

        <View style={[styles.avenueLabels, { width: boardSize }]}>
          {AVENUES.map((avenue) => (
            <Text key={avenue} style={styles.axisLabel}>
              {avenue}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 8,
    backgroundColor: 'rgba(6, 12, 12, 0.86)',
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 4,
  },
  meta: {
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bagText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  boardShell: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  streetLabels: {
    width: 18,
    justifyContent: 'space-around',
  },
  avenueLabels: {
    marginLeft: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  axisLabel: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  grid: {
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.52)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 12, 18, 0.92)',
  },
  beeper: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
  },
  beeperText: {
    color: '#120a02',
    fontSize: 11,
    fontWeight: '900',
  },
  karelToken: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 78, 59, 0.82)',
  },
  directionText: {
    position: 'absolute',
    right: 4,
    bottom: 1,
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '900',
  },
})
