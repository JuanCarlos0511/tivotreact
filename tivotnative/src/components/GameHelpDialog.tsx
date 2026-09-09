import { X } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { getTutorialStepsForLevel, TUTORIAL_COPY, type TutorialStep } from '../features/karel/editor/tutorial'
import { ResponsiveDialog } from './ResponsiveDialog'
import { ActionButton, IconButton, colors } from './ui'

export function GameHelpDialog({ visible, portrait, objective, step, onClose, onNext, onPrevious, onRestart }: {
  visible: boolean; portrait: boolean; objective: string; step: TutorialStep | null
  onClose: () => void; onNext: () => void; onPrevious: () => void; onRestart: () => void
}) {
  const tutorialSteps = getTutorialStepsForLevel(1)
  return (
    <ResponsiveDialog visible={visible} onClose={onClose} label="Ayuda de Karel"
      placement={portrait ? 'bottom' : 'center'} style={styles.dialog}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{step ? TUTORIAL_COPY[step].title : 'Objetivo del nivel'}</Text>
        <IconButton label="Cerrar ayuda" onPress={onClose}><X size={18} color={colors.text} /></IconButton>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {step && <Text style={styles.progress}>Paso {tutorialSteps.indexOf(step) + 1} de {tutorialSteps.length}</Text>}
        {(!step || step === 'chat') && <Text style={styles.objective}>{objective}</Text>}
        <Text style={styles.body}>{step ? TUTORIAL_COPY[step].body
          : 'Selecciona una línea y pulsa un comando para reemplazarla. Usa las flechas para ordenar tu programa y la papelera para borrar. Ejecutar comprueba el código y corre las instrucciones en ese mismo orden.'}</Text>
      </ScrollView>
      <View style={styles.actions}>
        <ActionButton label={step ? 'Omitir' : 'Ver tutorial'} onPress={step ? onClose : onRestart} />
        {step && step !== 'chat' && <ActionButton label="Anterior" onPress={onPrevious} />}
        <ActionButton label={step ? step === 'reset' ? 'Finalizar' : 'Siguiente' : 'Entendido'}
          variant="primary" onPress={step ? onNext : onClose} />
      </View>
    </ResponsiveDialog>
  )
}
const styles = StyleSheet.create({
  dialog: { padding: 18, maxWidth: 540 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { flex: 1, minWidth: 0, color: colors.text, fontSize: 18, fontWeight: '800' },
  content: { gap: 12, paddingBottom: 16 },
  progress: { color: colors.accentStrong, fontSize: 12 },
  objective: { backgroundColor: colors.successBg, padding: 12, borderRadius: 8, color: colors.text, fontSize: 14, lineHeight: 22 },
  body: { color: colors.text, fontSize: 14, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
})
