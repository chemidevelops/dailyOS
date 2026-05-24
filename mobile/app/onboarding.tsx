import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Text, Button, HStack, VStack, Card } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
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
  return (
    <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
      {options.map(opt => (
        <Pressable
          key={String(opt)}
          onPress={() => onChange(opt)}
          style={[
            styles.chip,
            value === String(opt) && {
              backgroundColor: getColor ? getColor(opt) : Colors.textPrimary,
              borderColor: getColor ? getColor(opt) : Colors.textPrimary,
            },
          ]}
        >
          <Text variant="captionMedium" customColor={value === String(opt) ? Colors.textInverse : Colors.textSecondary}>
            {getLabel(opt)}
          </Text>
        </Pressable>
      ))}
    </HStack>
  )
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <HStack gap="sm" style={{ marginBottom: Spacing.xl }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            { backgroundColor: i < step ? Colors.textPrimary : Colors.border },
          ]}
        />
      ))}
    </HStack>
  )
}

// ─── Step 1: Horario ─────────────────────────────────────────────────────────

const HOURS = ['06:00','07:00','07:30','08:00','08:30','09:00','09:30','10:00']
const END_HOURS = ['16:00','16:30','17:00','17:30','18:00','18:30','19:00','20:00']
const SLEEP_HOURS = ['21:00','22:00','22:30','23:00','23:30','00:00','01:00']

function StepSchedule({ onNext }: { onNext: (workStart: string, workEnd: string, sleepStart: string) => void }) {
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
                  style={[styles.chip, workStart === h && styles.chipSelected]}
                >
                  <Text variant="captionMedium" customColor={workStart === h ? Colors.textInverse : Colors.textSecondary}>{h}</Text>
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
                  style={[styles.chip, workEnd === h && styles.chipSelected]}
                >
                  <Text variant="captionMedium" customColor={workEnd === h ? Colors.textInverse : Colors.textSecondary}>{h}</Text>
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
              style={[styles.chip, sleepStart === h && styles.chipSelected]}
            >
              <Text variant="captionMedium" customColor={sleepStart === h ? Colors.textInverse : Colors.textSecondary}>{h}</Text>
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
const COLORS    = ['#3D5AFE', '#00C896', '#FF7700', '#FF4D30', '#8B2FC9', '#FFD600']

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
      <Text variant="displayLarge" color="primary" style={{ marginBottom: Spacing.xs }}>Tus hábitos</Text>
      <Text variant="body" color="secondary" style={{ marginBottom: Spacing.xl }}>
        Añade los hábitos que quieres trabajar. Puedes añadir más después.
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
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Estudiar japonés, Correr..."
            placeholderTextColor={Colors.textTertiary}
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
            <Pressable key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}>
              {color === c && <Text variant="micro" color="inverse">✓</Text>}
            </Pressable>
          ))}
        </HStack>

        <Button
          label="+ Añadir hábito"
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

type LeisureType = 'game' | 'anime' | 'book' | 'series'
type LeisureDraft = { title: string; type: LeisureType; color: string; status: 'playing' | 'pending'; habitIndex: number | null }

const LEISURE_TYPES: { key: LeisureType; label: string }[] = [
  { key: 'game',   label: 'Juego' },
  { key: 'anime',  label: 'Anime' },
  { key: 'book',   label: 'Libro' },
  { key: 'series', label: 'Serie' },
]
const LEISURE_COLORS = ['#FF4D30', '#3D5AFE', '#FF7700', '#8B2FC9', '#00C896', '#FFD600']

function LeisureDraftCard({ item, habits, onRemove }: { item: LeisureDraft; habits: HabitDraft[]; onRemove: () => void }) {
  const typeLabel  = LEISURE_TYPES.find(t => t.key === item.type)!.label
  const habitLabel = item.habitIndex !== null ? habits[item.habitIndex]?.title : null
  return (
    <HStack style={styles.draftCard} gap="md">
      <View style={[styles.draftColor, { backgroundColor: item.color }]} />
      <VStack gap="xs" style={{ flex: 1 }}>
        <Text variant="bodyMedium" color="primary">{item.title}</Text>
        <Text variant="micro" color="tertiary">
          {typeLabel} · {item.status === 'playing' ? 'En curso' : 'Pendiente'}
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
  const [items,      setItems]      = useState<LeisureDraft[]>([])
  const [title,      setTitle]      = useState('')
  const [type,       setType]       = useState<LeisureType>('game')
  const [color,      setColor]      = useState(LEISURE_COLORS[0])
  const [status,     setStatus]     = useState<'playing'|'pending'>('pending')
  const [habitIndex, setHabitIndex] = useState<number | null>(null)

  const addItem = () => {
    if (!title.trim()) return
    setItems(prev => [...prev, { title: title.trim(), type, color, status, habitIndex }])
    setTitle('')
    setHabitIndex(null)
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text variant="displayLarge" color="primary" style={{ marginBottom: Spacing.xs }}>Tu ocio</Text>
      <Text variant="body" color="secondary" style={{ marginBottom: Spacing.xl }}>
        Juegos, anime, libros, series... lo que tienes en cola o estás disfrutando ahora.
      </Text>

      {items.length > 0 && (
        <View style={styles.section}>
          {items.map((item, i) => (
            <LeisureDraftCard key={i} item={item} habits={habits} onRemove={() => setItems(prev => prev.filter((_, j) => j !== i))} />
          ))}
        </View>
      )}

      <Card style={styles.section}>
        <Text variant="micro" color="secondary" style={styles.label}>TIPO</Text>
        <ChipRow
          options={LEISURE_TYPES.map(t => t.key) as LeisureType[]}
          value={type}
          onChange={setType}
          getLabel={v => LEISURE_TYPES.find(t => t.key === v)!.label}
        />

        <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>TÍTULO</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Hollow Knight, Frieren..."
            placeholderTextColor={Colors.textTertiary}
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
          getColor={v => v === 'playing' ? Colors.mint : Colors.indigo}
        />

        {habits.length > 0 && (
          <>
            <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>PERTENECE AL HÁBITO</Text>
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => setHabitIndex(null)}
                style={[styles.chip, habitIndex === null && styles.chipSelected]}
              >
                <Text variant="captionMedium" customColor={habitIndex === null ? Colors.textInverse : Colors.textSecondary}>Ninguno</Text>
              </Pressable>
              {habits.map((h, i) => (
                <Pressable
                  key={i}
                  onPress={() => setHabitIndex(i)}
                  style={[styles.chip, habitIndex === i && { backgroundColor: h.color, borderColor: h.color }]}
                >
                  <Text variant="captionMedium" customColor={habitIndex === i ? '#fff' : Colors.textSecondary}>{h.title}</Text>
                </Pressable>
              ))}
            </HStack>
          </>
        )}

        <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.md }]}>COLOR</Text>
        <HStack gap="sm">
          {LEISURE_COLORS.map(c => (
            <Pressable key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}>
              {color === c && <Text variant="micro" color="inverse">✓</Text>}
            </Pressable>
          ))}
        </HStack>

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
type LeisureDraftOut = { title: string; type: LeisureType; color: string; status: 'playing' | 'pending'; habitIndex: number | null }

export default function OnboardingScreen() {
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
      // Save habits — keep the saved IDs to link leisure items
      const savedHabitIds: number[] = []
      for (const h of habitsData) {
        const saved = await api.habits.create({
          title: h.title,
          color: h.color,
          target_per_week: h.target,
          duration_minutes: h.duration,
          category: 'productivity',
        })
        savedHabitIds.push(saved.id)
      }
      // Save leisure — link to habit if selected
      for (const l of leisureItems) {
        const habitId = l.habitIndex !== null ? (savedHabitIds[l.habitIndex] ?? null) : null
        await api.leisure.create({
          title: l.title,
          type: l.type,
          color: l.color,
          status: l.status,
          progress: 0,
          habit_id: habitId,
        })
      }
      router.replace('/(tabs)')
    } catch {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
  safe:   { flex: 1, backgroundColor: Colors.bg },
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  chipSelected: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
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
    color: Colors.textPrimary,
    outline: 'none',
  } as any,

  colorDot: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2.5, borderColor: Colors.border,
    ...Shadow.brutalSm,
  },

  draftCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  draftColor: {
    width: 12, height: 12, borderRadius: 3,
  },
})
