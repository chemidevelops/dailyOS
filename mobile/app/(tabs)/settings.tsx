import { useState, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet, TextInput, Pressable, ActivityIndicator, Switch, Modal } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Text, Card, PressableCard, HStack, VStack } from '@/components/ui'
import { Spacing, Radius, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { api, ApiSettings, ApiCategory, ApiCategoryCreate, CategoryType } from '@/constants/api'

const TODAY_ISO = new Date().toISOString().split('T')[0]

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7]

const CATEGORY_TYPES: { value: CategoryType; label: string; icon: string }[] = [
  { value: 'series',   label: 'Series',   icon: '📺' },
  { value: 'anime',    label: 'Anime',    icon: '🍥' },
  { value: 'manga',    label: 'Manga',    icon: '📖' },
  { value: 'book',     label: 'Libros',   icon: '📚' },
  { value: 'game',     label: 'Juegos',   icon: '🎮' },
  { value: 'podcast',  label: 'Podcasts', icon: '🎙️' },
  { value: 'magazine', label: 'Revistas', icon: '📰' },
  { value: 'other',    label: 'Otro',     icon: '⭐' },
]

const PALETTE = [
  '#6366f1', '#FF4D30', '#00C896', '#FFD600', '#FF7700',
  '#8B2FC9', '#3D5AFE', '#0EA5E9', '#F43F5E', '#10B981',
]

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="micro" color="secondary" style={{ marginBottom: Spacing.sm, marginTop: Spacing.lg }}>
      {children}
    </Text>
  )
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const C = useColors()
  return (
    <HStack style={{ alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm }}>
      <Text variant="bodyMedium" color="primary">{label}</Text>
      <View style={[styles.timeInput, { borderColor: C.border, backgroundColor: C.surface }]}>
        <TextInput
          style={[styles.timeInputText, { color: C.textPrimary }]}
          value={value}
          onChangeText={onChange}
          placeholder="HH:MM"
          placeholderTextColor={C.textTertiary}
          maxLength={5}
          keyboardType="numeric"
        />
      </View>
    </HStack>
  )
}

// ─── New Category Modal ───────────────────────────────────────────────────────

function NewCategoryModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const C = useColors()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [icon, setIcon] = useState('⭐')
  const [type, setType] = useState<CategoryType>('other')
  const [goalMinutes, setGoalMinutes] = useState(0)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle(''); setColor(PALETTE[0]); setIcon('⭐'); setType('other'); setGoalMinutes(0)
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await api.categories.create({
        title: title.trim(),
        color,
        icon,
        type,
        weekly_goal_minutes: goalMinutes,
      })
      reset()
      onCreated()
      onClose()
    } catch {}
    finally { setSaving(false) }
  }

  // Auto-fill icon based on type
  const handleTypeSelect = (t: CategoryType) => {
    setType(t)
    const found = CATEGORY_TYPES.find(ct => ct.value === t)
    if (found) setIcon(found.icon)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <HStack style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: C.border }}>
          <Text variant="displayMedium" color="primary">Nueva categoría</Text>
          <Pressable onPress={onClose}>
            <Text variant="captionMedium" color="secondary">Cerrar</Text>
          </Pressable>
        </HStack>

        <ScrollView contentContainerStyle={{ padding: Spacing.xl }}>
          <VStack gap="lg">
            <VStack gap="sm">
              <Text variant="micro" color="secondary">NOMBRE</Text>
              <View style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: Radius.md, backgroundColor: C.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ej. Series, Videojuegos..."
                  placeholderTextColor={C.textTertiary}
                  style={{ color: C.textPrimary, fontSize: 15, outline: 'none' } as any}
                />
              </View>
            </VStack>

            <VStack gap="sm">
              <Text variant="micro" color="secondary">TIPO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {CATEGORY_TYPES.map(ct => (
                  <Pressable key={ct.value} onPress={() => handleTypeSelect(ct.value)}
                    style={[styles.typeChip, {
                      backgroundColor: type === ct.value ? C.textPrimary : C.surface,
                      borderColor: type === ct.value ? C.textPrimary : C.border,
                    }]}>
                    <Text variant="captionMedium" customColor={type === ct.value ? C.textInverse : C.textPrimary}>
                      {ct.icon} {ct.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </VStack>

            <VStack gap="sm">
              <Text variant="micro" color="secondary">ICONO (emoji)</Text>
              <View style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: Radius.md, backgroundColor: C.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
                <TextInput
                  value={icon}
                  onChangeText={setIcon}
                  placeholder="⭐"
                  placeholderTextColor={C.textTertiary}
                  style={{ color: C.textPrimary, fontSize: 24, outline: 'none' } as any}
                  maxLength={4}
                />
              </View>
            </VStack>

            <VStack gap="sm">
              <Text variant="micro" color="secondary">COLOR</Text>
              <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
                {PALETTE.map(c => (
                  <Pressable key={c} onPress={() => setColor(c)}
                    style={[styles.colorSwatch, {
                      backgroundColor: c,
                      borderWidth: color === c ? 3 : 1.5,
                      borderColor: color === c ? C.textPrimary : c,
                    }]} />
                ))}
              </HStack>
            </VStack>

            <VStack gap="sm">
              <Text variant="micro" color="secondary">META SEMANAL (minutos)</Text>
              <HStack gap="sm" style={{ alignItems: 'center' }}>
                <Pressable onPress={() => setGoalMinutes(g => Math.max(0, g - 30))}
                  style={[styles.countBtn, { borderColor: C.border }]} hitSlop={8}>
                  <Text variant="captionMedium" color="secondary">−</Text>
                </Pressable>
                <Text variant="displayMedium" color="primary" style={{ minWidth: 60, textAlign: 'center' }}>
                  {goalMinutes}m
                </Text>
                <Pressable onPress={() => setGoalMinutes(g => g + 30)}
                  style={[styles.countBtn, { borderColor: C.border }]} hitSlop={8}>
                  <Text variant="captionMedium" color="secondary">+</Text>
                </Pressable>
              </HStack>
            </VStack>

            <Pressable
              onPress={handleSave}
              disabled={saving || !title.trim()}
              style={[{
                backgroundColor: C.textPrimary,
                borderRadius: Radius.full,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                opacity: (!title.trim() || saving) ? 0.4 : 1,
              }]}
            >
              {saving
                ? <ActivityIndicator color={C.textInverse} size="small" />
                : <Text variant="bodyMedium" color="inverse">Crear categoría</Text>
              }
            </Pressable>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const C = useColors()
  const insets = useSafeAreaInsets()
  const [settings, setSettings] = useState<ApiSettings | null>(null)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [showNewCat, setShowNewCat] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, cats] = await Promise.all([api.settings.get(), api.categories.list()])
      setSettings(s)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const save = (patch: Partial<ApiSettings>) => {
    if (!settings) return
    const updated = { ...settings, ...patch }
    setSettings(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try { await api.settings.update(patch) } catch {}
      finally { setSaving(false) }
    }, 600)
  }

  const toggleWorkDay = (day: number) => {
    if (!settings) return
    const current = settings.work_days.split(',').map(Number).filter(Boolean)
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => a - b)
    save({ work_days: next.join(',') })
  }

  const toggleVacationToday = () => {
    if (!settings) return
    let dates: string[] = []
    try { dates = JSON.parse(settings.vacation_dates ?? '[]') } catch {}
    const isVacation = dates.includes(TODAY_ISO)
    const next = isVacation ? dates.filter(d => d !== TODAY_ISO) : [...dates, TODAY_ISO]
    save({ vacation_dates: JSON.stringify(next) })
  }

  const handleDeleteCategory = async (cat: ApiCategory) => {
    try {
      await api.categories.delete(cat.id)
      setCategories(prev => prev.filter(c => c.id !== cat.id))
    } catch {}
  }

  const workDaySet = settings ? new Set(settings.work_days.split(',').map(Number).filter(Boolean)) : new Set<number>()

  let vacationDates: string[] = []
  try { vacationDates = JSON.parse(settings?.vacation_dates ?? '[]') } catch {}
  const isVacationToday = vacationDates.includes(TODAY_ISO)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="displayLarge" color="primary">Ajustes</Text>
            {saving && <ActivityIndicator size="small" color={C.textTertiary} />}
          </View>
        </View>

        {loading ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.textPrimary} />
          </View>
        ) : settings ? (
          <View style={styles.section}>

            <SectionLabel>HORARIO DE TRABAJO</SectionLabel>
            <Card padding="md">
              <TimeInput label="Hora inicio" value={settings.work_start} onChange={v => save({ work_start: v })} />
              <View style={{ height: 1, backgroundColor: C.border, marginVertical: 2 }} />
              <TimeInput label="Hora fin" value={settings.work_end} onChange={v => save({ work_end: v })} />
            </Card>

            <SectionLabel>HORA DE DORMIR</SectionLabel>
            <Card padding="md">
              <TimeInput label="Me acuesto" value={settings.sleep_start} onChange={v => save({ sleep_start: v })} />
            </Card>

            <SectionLabel>DÍAS LABORABLES</SectionLabel>
            <Card padding="md">
              <HStack gap="sm" style={{ justifyContent: 'space-between' }}>
                {DAY_VALUES.map((day, i) => {
                  const active = workDaySet.has(day)
                  return (
                    <Pressable key={day} onPress={() => toggleWorkDay(day)}
                      style={[styles.dayChip, {
                        backgroundColor: active ? C.textPrimary : C.surface2,
                        borderColor: active ? C.textPrimary : C.border,
                      }]}>
                      <Text variant="captionMedium" customColor={active ? C.textInverse : C.textTertiary}>
                        {DAY_LABELS[i]}
                      </Text>
                    </Pressable>
                  )
                })}
              </HStack>
            </Card>

            <SectionLabel>OCUPACIÓN MÁXIMA</SectionLabel>
            <Card padding="md">
              <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" color="primary">Máximo a planificar</Text>
                <HStack gap="sm" style={{ alignItems: 'center' }}>
                  <Pressable onPress={() => save({ max_fill_pct: Math.max(10, (settings.max_fill_pct ?? 80) - 10) })}
                    style={[styles.countBtn, { borderColor: C.border }]} hitSlop={8}>
                    <Text variant="captionMedium" color="secondary">−</Text>
                  </Pressable>
                  <Text variant="displayMedium" color="primary" style={{ minWidth: 44, textAlign: 'center' }}>
                    {settings.max_fill_pct}%
                  </Text>
                  <Pressable onPress={() => save({ max_fill_pct: Math.min(100, (settings.max_fill_pct ?? 80) + 10) })}
                    style={[styles.countBtn, { borderColor: C.border }]} hitSlop={8}>
                    <Text variant="captionMedium" color="secondary">+</Text>
                  </Pressable>
                </HStack>
              </HStack>
            </Card>

            <SectionLabel>VACACIONES</SectionLabel>
            <Card padding="md">
              <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <VStack gap="xs">
                  <Text variant="bodyMedium" color="primary">Vacaciones hoy</Text>
                  <Text variant="micro" color="tertiary">
                    {isVacationToday ? 'Hoy es día de descanso' : 'Hoy es día normal'}
                  </Text>
                </VStack>
                <Switch
                  value={isVacationToday}
                  onValueChange={toggleVacationToday}
                  trackColor={{ false: C.border, true: C.mint }}
                  thumbColor={C.bg}
                />
              </HStack>
              {vacationDates.length > 0 && (
                <View style={{ marginTop: Spacing.md }}>
                  <Text variant="micro" color="tertiary">
                    {vacationDates.length} día{vacationDates.length !== 1 ? 's' : ''} de vacaciones programados
                  </Text>
                </View>
              )}
            </Card>

            {/* Categories */}
            <SectionLabel>CATEGORÍAS</SectionLabel>
            <Card padding="none">
              {categories.map((cat, i) => (
                <View key={cat.id}>
                  <HStack style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center' }} gap="md">
                    <View style={[styles.catIconBadge, { backgroundColor: cat.color }]}>
                      <Text variant="micro" customColor="#fff">{cat.icon}</Text>
                    </View>
                    <VStack gap="xs" style={{ flex: 1 }}>
                      <Text variant="bodyMedium" color="primary">{cat.title}</Text>
                      <Text variant="micro" color="tertiary">
                        {CATEGORY_TYPES.find(t => t.value === cat.type)?.label ?? cat.type}
                        {cat.weekly_goal_minutes > 0 ? ` · ${cat.weekly_goal_minutes}min/sem` : ''}
                      </Text>
                    </VStack>
                    <Pressable onPress={() => handleDeleteCategory(cat)} hitSlop={10}>
                      <Text variant="micro" color="tertiary">✕</Text>
                    </Pressable>
                  </HStack>
                  {i < categories.length - 1 && (
                    <View style={{ height: 1, backgroundColor: C.borderLight, marginHorizontal: Spacing.lg }} />
                  )}
                </View>
              ))}
              <Pressable
                onPress={() => setShowNewCat(true)}
                style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: categories.length > 0 ? 1 : 0, borderTopColor: C.borderLight }}
              >
                <Text variant="captionMedium" color="accent">+ Nueva categoría</Text>
              </Pressable>
            </Card>

          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <NewCategoryModal
        visible={showNewCat}
        onClose={() => setShowNewCat(false)}
        onCreated={load}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { flexGrow: 1 },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },

  section: { paddingHorizontal: Spacing.xl },

  timeInput: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minWidth: 80,
    alignItems: 'center',
  },
  timeInputText: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    outline: 'none',
  } as any,

  dayChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minHeight: 40,
  },

  countBtn: {
    width: 32, height: 32,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },

  colorSwatch: {
    width: 32, height: 32, borderRadius: 16,
  },

  catIconBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
})
