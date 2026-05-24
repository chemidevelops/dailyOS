import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Text, Button, HStack, VStack } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { api } from '@/constants/api'

type ItemType = 'habit' | 'task' | 'leisure'
type LeisureType = 'game' | 'anime' | 'book' | 'series'

const ITEM_TYPES: { key: ItemType; label: string; color: string }[] = [
  { key: 'habit',   label: 'HÁBITO',  color: Colors.mint },
  { key: 'task',    label: 'TAREA',   color: Colors.indigo },
  { key: 'leisure', label: 'OCIO',    color: Colors.coral },
]

const LEISURE_TYPES: { key: LeisureType; label: string }[] = [
  { key: 'game',   label: 'Juego' },
  { key: 'anime',  label: 'Anime' },
  { key: 'book',   label: 'Libro' },
  { key: 'series', label: 'Serie' },
]

const DURATIONS = [10, 15, 20, 30, 45, 60, 90]

const COLORS = [
  Colors.indigo, Colors.mint, Colors.coral, Colors.yellow,
  '#8B2FC9', '#FF7700', '#3D5AFE', '#FF4D30',
]

const HABIT_TARGETS = [2, 3, 4, 5, 6, 7]

function SectionLabel({ label }: { label: string }) {
  return <Text variant="micro" color="secondary" style={{ marginBottom: Spacing.sm }}>{label}</Text>
}

function ChipRow<T extends string>({
  options, value, onChange, getLabel, getColor,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  getLabel: (v: T) => string
  getColor?: (v: T) => string
}) {
  return (
    <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
      {options.map(opt => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          style={[
            styles.chip,
            value === opt && {
              backgroundColor: getColor ? getColor(opt) : Colors.textPrimary,
              borderColor: getColor ? getColor(opt) : Colors.textPrimary,
            },
          ]}
        >
          <Text
            variant="captionMedium"
            customColor={value === opt ? Colors.textInverse : Colors.textSecondary}
          >
            {getLabel(opt)}
          </Text>
        </Pressable>
      ))}
    </HStack>
  )
}

export default function AddScreen() {
  const router = useRouter()

  const [type,        setType]        = useState<ItemType>('habit')
  const [title,       setTitle]       = useState('')
  const [duration,    setDuration]    = useState(30)
  const [color,       setColor]       = useState(Colors.mint)
  const [leisureType, setLeisureType] = useState<LeisureType>('game')
  const [targetPerWk, setTargetPerWk] = useState(5)
  const [priority,    setPriority]    = useState<'high'|'medium'|'low'>('medium')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const canSave = title.trim().length > 0 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (type === 'habit') {
        await api.habits.create({
          title: title.trim(),
          color,
          target_per_week: targetPerWk,
          duration_minutes: duration,
          category: 'productivity',
        })
      } else if (type === 'task') {
        await api.tasks.create({
          title: title.trim(),
          color,
          priority,
          duration_minutes: duration,
        })
      } else {
        await api.leisure.create({
          title: title.trim(),
          type: leisureType,
          color,
          status: 'pending',
          progress: 0,
        })
      }
      router.back()
    } catch (e: any) {
      setError('Error al guardar. Comprueba tu conexión.')
      setSaving(false)
    }
  }

  const currentType = ITEM_TYPES.find(t => t.key === type)!

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <HStack style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text variant="captionMedium" color="secondary">Cancelar</Text>
          </Pressable>
          <Text variant="captionMedium" color="primary">Nuevo item</Text>
          <Pressable onPress={handleSave} disabled={!canSave}>
            {saving
              ? <ActivityIndicator size="small" color={Colors.textPrimary} />
              : <Text
                  variant="captionMedium"
                  customColor={canSave ? Colors.textPrimary : Colors.textTertiary}
                  style={{ fontWeight: FontWeight.bold }}
                >
                  Guardar
                </Text>
            }
          </Pressable>
        </HStack>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          <View style={styles.section}>
            <SectionLabel label="TIPO" />
            <HStack gap="sm">
              {ITEM_TYPES.map(t => (
                <Pressable
                  key={t.key}
                  onPress={() => { setType(t.key); setColor(t.color) }}
                  style={[
                    styles.typeChip,
                    type === t.key && { backgroundColor: t.color, borderColor: t.color },
                  ]}
                >
                  <Text variant="captionMedium" customColor={type === t.key ? '#fff' : Colors.textSecondary}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          </View>

          <View style={styles.section}>
            <SectionLabel label="TÍTULO" />
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={
                  type === 'habit'   ? 'Ej: Estudiar japonés' :
                  type === 'task'    ? 'Ej: Preparar presentación' :
                                       'Ej: Hollow Knight'
                }
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
            </View>
          </View>

          {type === 'leisure' && (
            <View style={styles.section}>
              <SectionLabel label="CATEGORÍA" />
              <ChipRow
                options={LEISURE_TYPES.map(l => l.key) as LeisureType[]}
                value={leisureType}
                onChange={setLeisureType}
                getLabel={v => LEISURE_TYPES.find(l => l.key === v)!.label}
              />
            </View>
          )}

          {type !== 'leisure' && (
            <View style={styles.section}>
              <SectionLabel label="DURACIÓN" />
              <ChipRow
                options={DURATIONS as unknown as string[]}
                value={String(duration)}
                onChange={v => setDuration(Number(v))}
                getLabel={v => `${v}m`}
              />
            </View>
          )}

          {type === 'habit' && (
            <View style={styles.section}>
              <SectionLabel label="DÍAS POR SEMANA" />
              <ChipRow
                options={HABIT_TARGETS as unknown as string[]}
                value={String(targetPerWk)}
                onChange={v => setTargetPerWk(Number(v))}
                getLabel={v => v === '7' ? 'Cada día' : `${v}x`}
              />
            </View>
          )}

          {type === 'task' && (
            <View style={styles.section}>
              <SectionLabel label="PRIORIDAD" />
              <ChipRow
                options={['high', 'medium', 'low'] as ('high'|'medium'|'low')[]}
                value={priority}
                onChange={setPriority}
                getLabel={v => v === 'high' ? 'Alta' : v === 'medium' ? 'Media' : 'Baja'}
                getColor={v => v === 'high' ? Colors.coral : v === 'medium' ? Colors.yellow : Colors.mint}
              />
            </View>
          )}

          <View style={styles.section}>
            <SectionLabel label="COLOR" />
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                >
                  {color === c && (
                    <Text variant="micro" color="inverse" style={{ fontWeight: FontWeight.bold }}>✓</Text>
                  )}
                </Pressable>
              ))}
            </HStack>
          </View>

          {error && (
            <View style={styles.section}>
              <Text variant="caption" customColor={Colors.coral}>{error}</Text>
            </View>
          )}

        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={saving ? 'Guardando...' : `Añadir ${currentType.label.toLowerCase()}`}
            variant="primary"
            size="lg"
            onPress={handleSave}
            disabled={!canSave}
            style={{ width: '100%' }}
          />
        </View>

      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xl },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },

  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },

  typeChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.brutalSm,
  },
  input: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    outline: 'none',
  } as any,

  colorDot: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: Colors.border,
    ...Shadow.brutalSm,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
})
