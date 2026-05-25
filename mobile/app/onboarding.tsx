import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Text, Button, HStack, VStack, Card } from '@/components/ui'
import { Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { api } from '@/constants/api'

// ─── Shared ──────────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options, value, onChange, getLabel, getColor,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  getLabel: (v: T) => string
  getColor?: (v: T) => string
}) {
  const C = useColors()
  return (
    <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
      {options.map(opt => (
        <Pressable
          key={String(opt)}
          onPress={() => onChange(opt)}
          style={[
            styles.chip,
            { borderColor: C.border, backgroundColor: C.surface },
            value === String(opt) && {
              backgroundColor: getColor ? getColor(opt) : C.textPrimary,
              borderColor: getColor ? getColor(opt) : C.textPrimary,
            },
          ]}
        >
          <Text variant="captionMedium" customColor={value === String(opt) ? C.textInverse : C.textSecondary}>
            {getLabel(opt)}
          </Text>
        </Pressable>
      ))}
    </HStack>
  )
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const C = useColors()
  return (
    <HStack gap="sm" style={{ marginBottom: Spacing.xl }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            { backgroundColor: i < step ? C.textPrimary : C.border },
          ]}
        />
      ))}
    </HStack>
  )
}

// ─── Step 1: Horario ─────────────────────────────────────────────────────────

const HOURS = ['06:00','07:00','07:30','08:00','08:30','09:00','09:30','10:00']
const END_HOURS = ['16:00','16:30','17:00','17:30','18:00','18:30','19:00','20:00']
const SLEEP_HOURS = ['21:00','22:00','22:30','23:00','23:30','00:00','01:00','02:00']

function StepSchedule({ onNext }: { onNext: (workStart: string, workEnd: string, sleepStart: string) => void }) {
  const C = useColors()
  const [workStart,  setWorkStart]  = useState('09:00')
  const [workEnd,    setWorkEnd]    = useState('17:30')
  const [sleepStart, setSleepStart] = useState('23:00')
  const [hasJob,     setHasJob]     = useState<'yes'|'no'>('yes')

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent}>
      <Text variant="displayLarge" color="primary" style={{ marginBottom: Spacing.xs }}>Tu día</Text>
      <Text variant="body" color="secondary" style={{ marginBottom: Spacing.xl }}>
        Así sabré cuándo tienes tiempo libre para planificar.
      </Text>

      <View style={styles.section}>
        <Text variant="micro" color="secondary" style={styles.label}>¿TIENES TRABAJO FIJO?</Text>
        <ChipRow
          options={['yes', 'no'] as ('yes'|'no')[]}
          value={hasJob}
          onChange={setHasJob}
          getLabel={v => v === 'yes' ? 'Sí' : 'No'}
        />
      </View>

      {hasJob === 'yes' && (
        <>
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.label}>EMPIEZO A TRABAJAR</Text>
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              {HOURS.map(h => (
                <Pressable
                  key={h}
                  onPress={() => setWorkStart(h)}
                  style={[
                    styles.chip,
                    { borderColor: C.border, backgroundColor: C.surface },
                    workStart === h && { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
                  ]}
                >
                  <Text variant="captionMedium" customColor={workStart === h ? C.textInverse : C.textSecondary}>{h}</Text>
                </Pressable>
              ))}
            </HStack>
          </View>

          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.label}>TERMINO DE TRABAJAR</Text>
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              {END_HOURS.map(h => (
                <Pressable
                  key={h}
                  onPress={() => setWorkEnd(h)}
                  style={[
                    styles.chip,
                    { borderColor: C.border, backgroundColor: C.surface },
                    workEnd === h && { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
                  ]}
                >
                  <Text variant="captionMedium" customColor={workEnd === h ? C.textInverse : C.textSecondary}>{h}</Text>
                </Pressable>
              ))}
            </HStack>
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text variant="micro" color="secondary" style={styles.label}>ME DUERMO SOBRE LAS</Text>
        <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
          {SLEEP_HOURS.map(h => (
            <Pressable
              key={h}
              onPress={() => setSleepStart(h)}
              style={[
                styles.chip,
                { borderColor: C.border, backgroundColor: C.surface },
                sleepStart === h && { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
              ]}
            >
              <Text variant="captionMedium" customColor={sleepStart === h ? C.textInverse : C.textSecondary}>{h}</Text>
            </Pressable>
          ))}
        </HStack>
      </View>

      <View style={styles.section}>
        <Button
          label="Siguiente →"
          variant="primary"
          size="lg"
          onPress={() => onNext(hasJob === 'yes' ? workStart : '00:00', hasJob === 'yes' ? workEnd : '00:00', sleepStart)}
          style={{ width: '100%' }}
        />
      </View>
    </ScrollView>
  )
}

// ─── Step 2: Hábitos ─────────────────────────────────────────────────────────

const DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120, 150, 180]
const TARGETS   = [2, 3, 4, 5, 6, 7]
const COLORS    = [
  '#3D5AFE', '#00C896', '#FF4D30', '#FFD600',
  '#8B2FC9', '#FF7700', '#00BCD4', '#E91E8C',
  '#43A047', '#F4511E', '#1E88E5', '#6D4C41',
  '#546E7A', '#FFB300', '#00897B', '#D81B60',
]

type HabitDraft = { title: string; color: string; duration: number; target: number }

function HabitDraftCard({ habit, onRemove }: { habit: HabitDraft; onRemove: () => void }) {
  return (
    <HStack style={styles.draftCard} gap="md">
      <View style={[styles.draftColor, { backgroundColor: habit.color }]} />
      <VStack gap="xs" style={{ flex: 1 }}>
        <Text variant="bodyMedium" color="primary">{habit.title}</Text>
        <Text variant="micro" color="tertiary">{habit.duration}min · {habit.target === 7 ? 'cada día' : `${habit.target}x semana`}</Text>
      </VStack>
      <Pressable onPress={onRemove} hitSlop={12}>
        <Text variant="captionMedium" color="tertiary">✕</Text>
      </Pressable>
    </HStack>
  )
}

function StepHabits({ onNext, onBack }: { onNext: (habits: HabitDraft[]) => void; onBack: () => void }) {
  const C = useColors()
  const [habits,   setHabits]   = useState<HabitDraft[]>([])
  const [title,    setTitle]    = useState('')
  const [color,    setColor]    = useState(COLORS[0])
  const [duration, setDuration] = useState(30)
  const [target,   setTarget]   = useState(5)

  const addHabit = () => {
    if (!title.trim()) return
    setHabits(prev => [...prev, { title: title.trim(), color, duration, target }])
    setTitle('')
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text variant="displayLarge" color="primary" style={{ marginBottom: Spacing.xs }}>Tus actividades</Text>
      <Text variant="body" color="secondary" style={{ marginBottom: Spacing.xl }}>
        Añade las actividades que quieres trabajar. Puedes añadir más después.
      </Text>

      {habits.length > 0 && (
        <View style={styles.section}>
          {habits.map((h, i) => (
            <HabitDraftCard key={i} habit={h} onRemove={() => setHabits(prev => prev.filter((_, j) => j !== i))} />
          ))}
        </View>
      )}

      <Card style={styles.section}>
        <Text variant="micro" color="secondary" style={styles.label}>NOMBRE</Text>
        <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
          <TextInput
            style={[styles.input, { color: C.textPrimary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Estudiar japonés, Correr..."
            placeholderTextColor={C.textTertiary}
            returnKeyType="done"
            onSubmitEditing={addHabit}
          />
        </View>

        <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>DURACIÓN</Text>
        <ChipRow
          options={DURATIONS as unknown as string[]}
          value={String(duration)}
          onChange={v => setDuration(Number(v))}
          getLabel={v => `${v}m`}
        />

        <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>DÍAS/SEMANA</Text>
        <ChipRow
          options={TARGETS as unknown as string[]}
          value={String(target)}
          onChange={v => setTarget(Number(v))}
          getLabel={v => v === '7' ? 'Cada día' : `${v}x`}
        />

        <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>COLOR</Text>
        <HStack gap="sm">
          {COLORS.map(c => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c, borderColor: C.border },
                color === c && { borderWidth: 2.5, borderColor: C.border },
              ]}
            >
              {color === c && <Text variant="micro" color="inverse">✓</Text>}
            </Pressable>
          ))}
        </HStack>

        <Button
          label="+ Añadir actividad"
          variant="ghost"
          size="md"
          onPress={addHabit}
          disabled={!title.trim()}
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      <HStack gap="sm" style={styles.section}>
        <Button label="← Atrás" variant="ghost" size="lg" onPress={onBack} style={{ flex: 1 }} />
        <Button
          label={habits.length === 0 ? 'Saltar →' : 'Siguiente →'}
          variant="primary"
          size="lg"
          onPress={() => onNext(habits)}
          style={{ flex: 2 }}
        />
      </HStack>
    </ScrollView>
  )
}

// ─── Step 3: Ocio ─────────────────────────────────────────────────────────────

type LeisureDraft = { title: string; status: 'playing' | 'pending'; habitIndex: number | null }

function LeisureDraftCard({ item, habits, onRemove }: { item: LeisureDraft; habits: HabitDraft[]; onRemove: () => void }) {
  const C = useColors()
  const habitLabel = item.habitIndex !== null ? habits[item.habitIndex]?.title : null
  const habitColor = item.habitIndex !== null ? habits[item.habitIndex]?.color : C.border
  return (
    <HStack style={styles.draftCard} gap="md">
      <View style={[styles.draftColor, { backgroundColor: habitColor }]} />
      <VStack gap="xs" style={{ flex: 1 }}>
        <Text variant="bodyMedium" color="primary">{item.title}</Text>
        <Text variant="micro" color="tertiary">
          {item.status === 'playing' ? 'En curso' : 'Pendiente'}
          {habitLabel ? ` · ${habitLabel}` : ''}
        </Text>
      </VStack>
      <Pressable onPress={onRemove} hitSlop={12}>
        <Text variant="captionMedium" color="tertiary">✕</Text>
      </Pressable>
    </HStack>
  )
}

function StepLeisure({ onFinish, onBack, saving, habits }: {
  onFinish: (items: LeisureDraft[]) => void
  onBack: () => void
  saving: boolean
  habits: HabitDraft[]
}) {
  const C = useColors()
  const [items,      setItems]      = useState<LeisureDraft[]>([])
  const [title,      setTitle]      = useState('')
  const [status,     setStatus]     = useState<'playing'|'pending'>('pending')
  const [habitIndex, setHabitIndex] = useState<number | null>(null)

  const addItem = () => {
    if (!title.trim()) return
    setItems(prev => [...prev, { title: title.trim(), status, habitIndex }])
    setTitle('')
    setHabitIndex(null)
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text variant="displayLarge" color="primary" style={{ marginBottom: Spacing.xs }}>Tu backlog</Text>
      <Text variant="body" color="secondary" style={{ marginBottom: Spacing.xl }}>
        Añade los items concretos que tienes en cola: juegos, libros, animes... puedes asociarlos a una actividad.
      </Text>

      {items.length > 0 && (
        <View style={styles.section}>
          {items.map((item, i) => (
            <LeisureDraftCard key={i} item={item} habits={habits} onRemove={() => setItems(prev => prev.filter((_, j) => j !== i))} />
          ))}
        </View>
      )}

      <Card style={styles.section}>
        <Text variant="micro" color="secondary" style={styles.label}>TÍTULO</Text>
        <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
          <TextInput
            style={[styles.input, { color: C.textPrimary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Hollow Knight, Frieren..."
            placeholderTextColor={C.textTertiary}
            returnKeyType="done"
            onSubmitEditing={addItem}
          />
        </View>

        <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>ESTADO</Text>
        <ChipRow
          options={['playing', 'pending'] as ('playing'|'pending')[]}
          value={status}
          onChange={setStatus}
          getLabel={v => v === 'playing' ? 'En curso' : 'Pendiente'}
          getColor={v => v === 'playing' ? C.mint : C.indigo}
        />

        {habits.length > 0 && (
          <>
            <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>PERTENECE A LA ACTIVIDAD</Text>
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => setHabitIndex(null)}
                style={[
                  styles.chip,
                  { borderColor: C.border, backgroundColor: C.surface },
                  habitIndex === null && { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
                ]}
              >
                <Text variant="captionMedium" customColor={habitIndex === null ? C.textInverse : C.textSecondary}>Ninguno</Text>
              </Pressable>
              {habits.map((h, i) => (
                <Pressable
                  key={i}
                  onPress={() => setHabitIndex(i)}
                  style={[
                    styles.chip,
                    { borderColor: C.border, backgroundColor: C.surface },
                    habitIndex === i && { backgroundColor: h.color, borderColor: h.color },
                  ]}
                >
                  <Text variant="captionMedium" customColor={habitIndex === i ? '#fff' : C.textSecondary}>{h.title}</Text>
                </Pressable>
              ))}
            </HStack>
          </>
        )}

        <Button
          label="+ Añadir"
          variant="ghost"
          size="md"
          onPress={addItem}
          disabled={!title.trim()}
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      <HStack gap="sm" style={styles.section}>
        <Button label="← Atrás" variant="ghost" size="lg" onPress={onBack} style={{ flex: 1 }} />
        <Button
          label={saving ? 'Guardando...' : items.length === 0 ? 'Terminar →' : 'Empezar →'}
          variant="primary"
          size="lg"
          onPress={() => onFinish(items)}
          disabled={saving}
          style={{ flex: 2 }}
        />
      </HStack>
    </ScrollView>
  )
}

// ─── Main onboarding screen ───────────────────────────────────────────────────

type HabitDraftOut   = { title: string; color: string; duration: number; target: number }
type LeisureDraftOut = { title: string; status: 'playing' | 'pending'; habitIndex: number | null }

export default function OnboardingScreen() {
  const C = useColors()
  const router  = useRouter()
  const insets  = useSafeAreaInsets()
  const [step,         setStep]         = useState(1)
  const [scheduleData, setScheduleData] = useState<{ workStart: string; workEnd: string; sleepStart: string } | null>(null)
  const [habitsData,   setHabitsData]   = useState<HabitDraftOut[]>([])
  const [saving,       setSaving]       = useState(false)

  const handleSchedule = (workStart: string, workEnd: string, sleepStart: string) => {
    setScheduleData({ workStart, workEnd, sleepStart })
    setStep(2)
  }

  const handleHabits = (habits: HabitDraftOut[]) => {
    setHabitsData(habits)
    setStep(3)
  }

  const handleFinish = async (leisureItems: LeisureDraftOut[]) => {
    setSaving(true)
    try {
      // Save settings
      if (scheduleData) {
        await api.settings.update({
          work_start: scheduleData.workStart,
          work_end: scheduleData.workEnd,
          sleep_start: scheduleData.sleepStart,
          onboarding_done: true,
        })
      }
      // Save activities — keep saved IDs to link items
      const savedActivityIds: number[] = []
      for (const h of habitsData) {
        const saved = await api.activities.create({
          title: h.title,
          color: h.color,
          target_per_week: h.target,
          duration_minutes: h.duration,
        })
        savedActivityIds.push(saved.id)
      }
      // Save backlog items — link to activity if selected
      for (const l of leisureItems) {
        const activityId = l.habitIndex !== null ? (savedActivityIds[l.habitIndex] ?? null) : null
        if (activityId !== null) {
          await api.items.create(activityId, {
            activity_id: activityId,
            title: l.title,
            status: l.status === 'playing' ? 'active' : 'pending',
          })
        }
      }
      router.replace('/(tabs)')
    } catch {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + Spacing.lg }]}>
          <Text variant="displayLarge" color="primary" style={{ marginBottom: Spacing.lg }}>DailyOS</Text>
          <ProgressBar step={step} total={3} />
        </View>

        {step === 1 && <StepSchedule onNext={handleSchedule} />}
        {step === 2 && <StepHabits onNext={handleHabits} onBack={() => setStep(1)} />}
        {step === 3 && <StepLeisure onFinish={handleFinish} onBack={() => setStep(2)} saving={saving} habits={habitsData} />}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  progressSegment: {
    flex: 1, height: 4, borderRadius: 2,
  },

  stepContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  },

  section: {
    marginBottom: Spacing.lg,
  },

  label: { marginBottom: Spacing.sm },

  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginBottom: Spacing.xs,
  },

  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    ...Shadow.brutalSm,
  },
  input: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    outline: 'none',
  } as any,

  colorDot: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },

  draftCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  draftColor: {
    width: 12, height: 12, borderRadius: 3,
  },
})
