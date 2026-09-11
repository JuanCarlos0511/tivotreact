import { ArrowLeft, Pencil, Play, Save, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { SavedChallengeGame } from '../shared/types'
import { IconButton, colors } from './ui'

export function SavedChallengesScreen({ games, onBack, onLoad, onRename, onDelete }: {
  games: readonly SavedChallengeGame[]
  onBack: () => void
  onLoad: (game: SavedChallengeGame) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const commitEditing = () => {
    if (!editingId || !draftName.trim()) return
    onRename(editingId, draftName)
    setEditingId(null)
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconButton label="Volver a niveles" onPress={onBack}><ArrowLeft size={18} color={colors.muted} /></IconButton>
          <View><Text style={styles.badge}>NIVEL 5</Text><Text accessibilityRole="header" style={styles.title}>Mis partidas guardadas</Text></View>
        </View>
        {games.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emoji}>🎒</Text><Text style={styles.emptyTitle}>Aún no hay partidas guardadas</Text><Text style={styles.meta}>Entra al desafío y usa “Guardar y salir” para continuar después.</Text></View>
        ) : games.map(game => {
          const remaining = game.level.initialWorld.beepers.reduce((total, beeper) => total + beeper.count, 0)
          return (
            <View key={game.id} style={styles.card}>
              <View style={styles.copy}>
                {editingId === game.id ? (
                  <TextInput autoFocus value={draftName} maxLength={50} onChangeText={setDraftName} onSubmitEditing={commitEditing}
                    returnKeyType="done" accessibilityLabel="Nombre de la partida" style={styles.input} />
                ) : <Text style={styles.cardTitle}>{game.name}</Text>}
                <Text style={styles.meta}>Robot en ({game.level.initialWorld.karelPosition.street},{game.level.initialWorld.karelPosition.avenue}) · {remaining} fichas pendientes</Text>
                <Text style={styles.date}>{new Date(game.savedAt).toLocaleString('es-MX')}</Text>
              </View>
              <View style={styles.actions}>
                <SmallAction label="Continuar" color="#08734f" textColor="#ffffff" icon={<Play size={14} color="#ffffff" />} onPress={() => onLoad(game)} />
                {editingId === game.id
                  ? <SmallAction label="Guardar nombre" icon={<Save size={14} color={colors.text} />} onPress={commitEditing} />
                  : <SmallAction label="Editar" icon={<Pencil size={14} color={colors.text} />} onPress={() => { setEditingId(game.id); setDraftName(game.name) }} />}
                <SmallAction label="Eliminar" color="#fff0ee" textColor={colors.error} icon={<Trash2 size={14} color={colors.error} />} onPress={() => onDelete(game.id)} />
              </View>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

function SmallAction({ label, icon, onPress, color = '#ffffff', textColor = '#202d29' }: {
  label: string; icon: React.ReactNode; onPress: () => void; color?: string; textColor?: string
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: color }, pressed && styles.pressed]}>{icon}<Text style={[styles.actionText, { color: textColor }]}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 18 },
  content: { width: '100%', maxWidth: 900, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  badge: { color: colors.accentStrong, fontSize: 10, fontWeight: '900' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  empty: { padding: 36, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.panel, alignItems: 'center', gap: 8 },
  emoji: { fontSize: 34 }, emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  card: { padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 16 },
  copy: { flex: 1, minWidth: 0, gap: 5 }, cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 17 }, date: { color: colors.faint, fontSize: 11 },
  input: { minHeight: 40, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.accentStrong, borderRadius: 7, backgroundColor: '#ffffff', color: colors.text, fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  action: { minHeight: 38, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionText: { fontSize: 11, fontWeight: '800' }, pressed: { opacity: 0.72 },
})
