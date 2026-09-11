import { ArrowUp } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native'
import type { KarelWorldPoint, KarelWorldState } from '../shared/types'
import { colors } from './ui'
import { KarelPlayerArrow } from './KarelPlayerArrow'

const STREETS = [8, 7, 6, 5, 4, 3, 2, 1]
const AVENUES = [1, 2, 3, 4, 5, 6, 7, 8]
const DIRECTIONS = { NORTE: '0deg', ESTE: '90deg', SUR: '180deg', OESTE: '270deg' }
const LABELS = { NORTE: 'Norte', ESTE: 'Este', SUR: 'Sur', OESTE: 'Oeste' }

export function KarelBoard({ world, goal, isRunning = false, hasError = false, wallCollision = false }: {
  world: KarelWorldState; goal: KarelWorldPoint; isRunning?: boolean; hasError?: boolean; wallCollision?: boolean
}) {
  const pulse = useRef(new Animated.Value(1)).current
  const [reduceMotion, setReduceMotion] = useState(true)
  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value) })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => { mounted = false; subscription.remove() }
  }, [])
  useEffect(() => {
    if (!isRunning || hasError || reduceMotion) { pulse.setValue(1); return }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 350, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]))
    animation.start()
    return () => { animation.stop(); pulse.setValue(1) }
  }, [isRunning, hasError, reduceMotion, pulse])
  const [gridSize, setGridSize] = useState(0)
  const tokenSize = Math.max(36, Math.min(48, Math.round((gridSize > 0 ? gridSize / 8 : 42) * 0.92)))
  return (
    <View testID="karel-board" accessibilityLabel="Mundo de Karel 8 por 8" style={styles.panel}>
      <View style={styles.metaRow}><Text style={styles.meta}>MUNDO 8X8</Text>
        <View accessibilityLabel={'Orientación: ' + LABELS[world.karelDirection]} style={styles.compass}>
          <ArrowUp size={13} color={hasError ? colors.error : colors.accentStrong} style={{ transform: [{ rotate: DIRECTIONS[world.karelDirection] }] }} />
          <Text style={styles.meta}>{LABELS[world.karelDirection]}</Text>
        </View>
      </View>
      <View style={styles.boardRow}>
        <View style={styles.streets}>{STREETS.map(street => <Text key={street} style={styles.axis}>{street}</Text>)}</View>
        <View testID="karel-grid" style={[styles.grid, wallCollision && styles.wallError]} onLayout={event => setGridSize(event.nativeEvent.layout.width)}>
          {STREETS.map(street => (
            <View key={street} style={styles.row}>
              {AVENUES.map(avenue => {
                const hasKarel = world.karelPosition.street === street && world.karelPosition.avenue === avenue
                const beeper = world.beepers.find(item => item.street === street && item.avenue === avenue)
                const isGoal = goal.street === street && goal.avenue === avenue
                const playerSize = isGoal ? Math.round(tokenSize * 0.82) : tokenSize
                return (
                  <View key={avenue} testID={'cell-' + street + '-' + avenue}
                    style={[styles.cell, avenue === 8 && styles.lastColumn, street === 1 && styles.lastRow]}>
                    {isGoal && (
                      <View accessibilityLabel={'Meta en calle ' + street + ', avenida ' + avenue}
                        style={[styles.goal, hasKarel && styles.goalReached]}>
                        {!hasKarel && <Text style={styles.goalText}>★</Text>}
                      </View>
                    )}
                    {beeper && !hasKarel && (
                      <View accessibilityLabel={beeper.count + ' fichas en calle ' + street + ', avenida ' + avenue}
                        style={[styles.beeper, { width: Math.min(22, tokenSize), height: Math.min(22, tokenSize) }]}>
                        <Text style={styles.beeperText}>{beeper.count}</Text>
                      </View>
                    )}
                    {hasKarel && (
                      <Animated.View testID="karel-token" accessibilityLabel={'Karel en calle ' + street + ', avenida ' + avenue + ', orientado al ' + world.karelDirection + (beeper ? ', sobre ' + beeper.count + ' fichas' : '')}
                        style={[
                          styles.token,
                          {
                            width: playerSize,
                            height: playerSize,
                            transform: [
                              { scale: pulse },
                            ],
                          },
                        ]}>
                        <KarelPlayerArrow
                          size={playerSize}
                          hasError={hasError}
                          direction={world.karelDirection}
                          beeperCount={beeper?.count}
                        />
                      </Animated.View>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.avenues}>{AVENUES.map(avenue => <Text key={avenue} style={styles.axis}>{avenue}</Text>)}</View>
    </View>
  )
}
const styles = StyleSheet.create({
  panel: { width: '100%', padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panel },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  compass: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wallError: { borderColor: colors.error },
  meta: { fontSize: 10, fontWeight: '800', color: colors.warningInk },
  boardRow: { flexDirection: 'row', gap: 5 },
  streets: { width: 14, justifyContent: 'space-around' },
  axis: { fontSize: 10, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  grid: { flex: 1, aspectRatio: 1, borderWidth: 2, borderColor: '#84d7b7', borderRadius: 8, overflow: 'hidden', backgroundColor: '#eff5f0' },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderRightWidth: 1, borderColor: '#d4dfd7', backgroundColor: '#f8fbf8' },
  lastColumn: { borderRightWidth: 0 },
  lastRow: { borderBottomWidth: 0 },
  avenues: { marginTop: 5, marginLeft: 19, height: 14, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  token: { zIndex: 2, alignItems: 'center', justifyContent: 'center' },
  beeper: { position: 'absolute', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbbf24', borderColor: '#f59e0b', borderWidth: 1 },
  beeperText: { fontSize: 10, fontWeight: '900', color: '#120a02' },
  goal: { position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#0f766e', backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  goalReached: { top: '1%', right: '1%', width: '98%', height: '98%', borderRadius: 999, borderWidth: 3, backgroundColor: 'rgba(254, 243, 199, 0.4)', borderColor: '#d97706' },
  goalText: { color: '#0f766e', fontSize: 10, lineHeight: 12, fontWeight: '900' },
})
