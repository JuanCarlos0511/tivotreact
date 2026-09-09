import { Check, X } from 'lucide-react-native'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { CONDITION_OPTIONS, getConditionOptions, configureCommand, validateProcedureName, type Condition } from '../features/karel/editor/command-config'
import { getCustomCommands, describeCodeLines, type CommandTemplate } from '../features/karel/editor/code-lines'
import { ResponsiveDialog } from './ResponsiveDialog'
import { ActionButton, IconButton, codeFont, colors } from './ui'
import { Pressable } from 'react-native'

export function CommandDialog({ command, code, conditions, initialLine, onClose, onInsert }: {
  command: CommandTemplate; code: string; conditions: readonly Condition[]; initialLine?: string; onClose: () => void; onInsert: (source: string[]) => void
}) {
  const conditionOptions = getConditionOptions(conditions, initialLine)
  const originalName = initialLine?.match(/^define-nueva-instruccion\s+([\w-]+)/)?.[1]
  const [condition, setCondition] = useState<Condition>(() => CONDITION_OPTIONS.find(option => initialLine?.includes(option.value))?.value ?? conditions[0] ?? 'frente-libre')
  const [count, setCount] = useState(initialLine?.match(/^repetir\s+(\d+)/)?.[1] ?? '2')
  const [name, setName] = useState(() => {
    if (originalName) return originalName
    const commands = getCustomCommands(describeCodeLines(code))
    let result = 'mi-instruccion'
    let suffix = 2
    while (commands.some(entry => entry.id === result)) result = 'mi-instruccion-' + suffix++
    return result
  })
  const needsCondition = command.id === 'si' || command.id === 'mientras'
  const isRepeat = command.id === 'repetir'
  const error = isRepeat
    ? (!/^\d+$/.test(count) || !Number.isSafeInteger(Number(count)) || Number(count) < 1 ? 'Escribe un número entero mayor que cero.' : null)
    : command.id === 'define-nueva-instruccion' ? validateProcedureName(name, code, originalName) : null
  const source = configureCommand(command, condition, Number(count), name)
  return (
    <ResponsiveDialog visible onClose={onClose} label={'Configurar ' + command.label}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{command.group}</Text>
          <Text accessibilityRole="header" style={styles.title}>{command.label}</Text>
        </View>
        <IconButton label="Cerrar configuración" onPress={onClose}><X size={18} color={colors.text} /></IconButton>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {needsCondition && conditionOptions.map(option => (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
            accessibilityState={{ checked: condition === option.value }} aria-checked={condition === option.value} onPress={() => setCondition(option.value)}
            style={[styles.option, condition === option.value && styles.selected]}>
            <View style={styles.optionHeading}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {condition === option.value && <Check size={16} color={colors.accentStrong} />}
            </View>
            <Text style={styles.syntax}>{option.value}</Text>
            <Text style={styles.description}>{option.description}</Text>
          </Pressable>
        ))}
        {!needsCondition && (
          <View style={styles.field}>
            <Text style={styles.kicker}>{isRepeat ? 'Número de veces' : 'Nombre de la instrucción'}</Text>
            <TextInput accessibilityLabel={isRepeat ? 'Número de veces' : 'Nombre de la instrucción'}
              value={isRepeat ? count : name} onChangeText={isRepeat ? setCount : setName}
              keyboardType={isRepeat ? 'number-pad' : 'default'} autoCapitalize="none" autoCorrect={false}
              style={styles.input} selectTextOnFocus />
          </View>
        )}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Text selectable style={styles.preview}>{error ? '' : (initialLine ? source.slice(0, 1) : source).join('\n')}</Text>
      </ScrollView>
      <View style={styles.actions}>
        <ActionButton label="Cancelar" onPress={onClose} />
        <ActionButton label={initialLine ? 'Guardar' : 'Insertar'} variant="primary" disabled={Boolean(error)}
          icon={<Check size={16} color={colors.accentDark} />} onPress={() => onInsert(source)} />
      </View>
    </ResponsiveDialog>
  )
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  kicker: { color: colors.accentStrong, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  content: { gap: 8, paddingBottom: 16 },
  option: { padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panelRaised, gap: 5 },
  selected: { borderColor: colors.accentStrong, backgroundColor: colors.successBg },
  optionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  optionLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  syntax: { color: colors.blue, fontFamily: codeFont, fontSize: 11 },
  description: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  field: { gap: 8 },
  input: { minHeight: 44, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 7, color: colors.text, backgroundColor: colors.panelRaised, fontSize: 14 },
  error: { color: colors.error, fontSize: 12 },
  preview: { padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.panelSoft, color: colors.accentStrong, fontFamily: codeFont, fontSize: 11, lineHeight: 19 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
})
