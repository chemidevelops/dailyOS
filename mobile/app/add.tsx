import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Text, Button, HStack, VStack } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { api, ApiActivity } from '@/constants/api'

type ItemType = 'activity' | 'task'

const ITEM_TYPES: { key: ItemType; label: string; color: string }[] = [
  { key: 'activity', label: 'ACTIVIDAD', color: Colors.mint },
  { key: 'task',     label: 'TAREA',     color: Colors.indigo },
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

  const [type,        setType]        = useState<ItemType>('activity')
  const [title,       setTitle]       = useState('')
  const [duration,    setDuration]    = useState(30)
  const [color,       setColor]       = useState(Colors.mint)
  const [targetPerWk, setTargetPerWk] = useState(5)
  const [priority,    setPriority]    = useState<'high'|'medium'|'low'>('medium')
  const [activityId,  setActivityId]  = useState<number | null>(null)
  const [activities,  setActivities]  = useState<ApiActivity[]>([])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    api.activities.list().then(a => setActivities(a.filter(x => x.is_active))).catch(() => {})
  }, [])

  const canSave = title.trim().length > 0 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (type === 'activity') {
        await api.activities.create({
          title: title.trim(),
          color,
          target_per_week: targetPerWk,
          duration_minutes: duration,
        })
      } else {
        const linkedActivity = activities.find(a => a.id === activityId)
        await api.tasks.create({
          title: title.trim(),
          color: linkedActivity ? linkedActivity.color : color,
          priority,
          duration_minutes: duration,
          activity_id: activityId,
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
                  type === 'activity' ? 'Ej: Ejercicio, Lectura...' :
                                        'Ej: Preparar presentación'
                }
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel label="DURACIÓN" />
            <ChipRow
              options={DURATIONS as unknown as string[]}
              value={String(duration)}
              onChange={v => setDuration(Number(v))}
              getLabel={v => `${v}m`}
            />
          </View>

          {type === 'activity' && (
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

          {type === 'task' && activities.length > 0 && (
            <View style={styles.section}>
              <SectionLabel label="VINCULAR A ACTIVIDAD (OPCIONAL)" />
              <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => setActivityId(null)}
                  style={[styles.chip, activityId === null && { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary }]}
                >
                  <Text variant="captionMedium" customColor={activityId === null ? Colors.textInverse : Colors.textSecondary}>Ninguna</Text>
                </Pressable>
                {activities.map(a => (
                  <Pressable
                    key={a.id}
                    onPress={() => setActivityId(a.id)}
                    style={[styles.chip, activityId === a.id && { backgroundColor: a.color, borderColor: a.color }]}
                  >
                    <Text variant="captionMedium" customColor={activityId === a.id ? '#fff' : Colors.textSecondary}>{a.title}</Text>
                  </Pressable>
                ))}
              </HStack>
              {activityId !== null && (
                <Text variant="micro" color="tertiary" style={{ marginTop: Spacing.xs }}>
                  El color se heredará de la actividad seleccionada.
                </Text>
              )}
            </View>
          )}

          {type === 'task' && activityId === null && (
            <View style={styles.section}>
              <SectionLabel label="COLOR" />
              <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                  >
                    {color === c && <Text variant="micro" color="inverse" style={{ fontWeight: FontWeight.bold }}>✓</Text>}
                  </Pressable>
                ))}
              </HStack>
            </View>
          )}

          {type === 'activity' && (
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
          )}

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
