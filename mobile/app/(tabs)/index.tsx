import { useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Text, Card, PressableCard, Button, HStack, VStack, Divider } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { api, ApiHabit, ApiTask } from '@/constants/api'

type Energy = 'high' | 'normal' | 'low'
type Mode   = 'focus' | 'normal' | 'rest'

const TODAY_ISO = new Date().toISOString().split('T')[0]

function EnergyCheckIn({ onSubmit }: { onSubmit: (e: Energy, m: Mode) => void }) {
  const [energy, setEnergy] = useState<Energy | null>(null)
  const [step, setStep]     = useState<'energy' | 'mode'>('energy')

  const ENERGY = [
    { value: 'high'   as Energy, label: 'ACTIVO',    bg: Colors.yellow,    fg: Colors.textPrimary },
    { value: 'normal' as Energy, label: 'NORMAL',    bg: Colors.surface,   fg: Colors.textPrimary },
    { value: 'low'    as Energy, label: 'TRANQUILO', bg: Colors.mintLight, fg: Colors.textPrimary },
  ]
  const MODES = [
    { value: 'focus'  as Mode, label: 'FOCO',     bg: Colors.indigoLight, fg: Colors.textPrimary },
    { value: 'normal' as Mode, label: 'NORMAL',   bg: Colors.surface,     fg: Colors.textPrimary },
    { value: 'rest'   as Mode, label: 'DESCANSO', bg: Colors.coralLight,  fg: Colors.textPrimary },
  ]

  const options = step === 'energy' ? ENERGY : MODES

  return (
    <View style={styles.checkInWrap}>
      <Text variant="micro" color="secondary" style={{ marginBottom: Spacing.sm }}>
        {step === 'energy' ? '¿CÓMO ESTÁS HOY?' : '¿QUÉ MODO QUIERES?'}
      </Text>
      <HStack gap="sm">
        {options.map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (step === 'energy') {
                setEnergy(opt.value as Energy)
                setTimeout(() => setStep('mode'), 180)
              } else {
                onSubmit(energy!, opt.value as Mode)
              }
            }}
            style={[
              styles.chip,
              { backgroundColor: opt.bg },
              energy === opt.value && step === 'energy' && styles.chipSelected,
            ]}
          >
            <Text variant="captionMedium" customColor={opt.fg}>{opt.label}</Text>
          </Pressable>
        ))}
      </HStack>
    </View>
  )
}

type TodayItem =
  | { kind: 'habit'; habit: ApiHabit }
  | { kind: 'task';  task: ApiTask }

function TodayCard({ item, onDone }: { item: TodayItem; onDone: () => void }) {
  const router = useRouter()

  const title    = item.kind === 'habit' ? item.habit.title : item.task.title
  const color    = item.kind === 'habit' ? item.habit.color : item.task.color
  const minutes  = item.kind === 'habit' ? item.habit.duration_minutes : item.task.duration_minutes
  const typeLabel = item.kind === 'habit' ? 'HÁBITO' : 'TAREA'

  const handleStart = () => router.push({
    pathname: '/focus',
    params: { title, minutes: String(minutes), color },
  })

  return (
    <PressableCard variant="elevated" style={styles.primaryCard} onPress={() => {}}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
        <View style={[styles.typeBadge, { backgroundColor: color }]}>
          <Text variant="micro" customColor="#fff">{typeLabel}</Text>
        </View>
        <View style={[styles.durationPill]}>
          <Text variant="micro" color="secondary">{minutes} MIN</Text>
        </View>
      </HStack>

      <Text variant="displayMedium" color="primary" numberOfLines={2} style={{ marginBottom: Spacing.lg }}>
        {title}
      </Text>

      <HStack style={{ justifyContent: 'flex-end' }} gap="sm">
        <Button label="Hecho" variant="ghost" size="sm" onPress={onDone} />
        {minutes > 0 && <Button label="Empezar →" variant="secondary" size="sm" onPress={handleStart} />}
      </HStack>
    </PressableCard>
  )
}

function AgendaRow({ item, onDone }: { item: TodayItem; onDone: () => void }) {
  const [done, setDone] = useState(false)
  const handle = () => { setDone(true); setTimeout(onDone, 300) }
  const title  = item.kind === 'habit' ? item.habit.title : item.task.title
  const color  = item.kind === 'habit' ? item.habit.color : item.task.color
  const mins   = item.kind === 'habit' ? item.habit.duration_minutes : item.task.duration_minutes

  return (
    <HStack style={[styles.agendaRow, done && { opacity: 0.3 }]} gap="md">
      <Pressable onPress={handle} hitSlop={12}>
        <View style={[styles.check, done && { backgroundColor: Colors.mint, borderColor: Colors.mint }]}>
          {done && <Text variant="micro" color="inverse">✓</Text>}
        </View>
      </Pressable>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <Text
        variant="bodyMedium"
        customColor={done ? Colors.textTertiary : Colors.textPrimary}
        style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : undefined]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text variant="micro" color="tertiary">{mins}m</Text>
    </HStack>
  )
}

function EmptyDayState() {
  const router = useRouter()
  return (
    <Card variant="highlighted" style={styles.emptyCard}>
      <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>
        Día en blanco
      </Text>
      <Text variant="body" color="secondary" style={{ marginBottom: Spacing.lg }}>
        Añade hábitos, tareas u ocio para empezar a planificar tu día.
      </Text>
      <Button
        label="Añadir algo +"
        variant="primary"
        size="md"
        onPress={() => router.push('/add')}
      />
    </Card>
  )
}

export default function TodayScreen() {
  const router = useRouter()
  const [checkInDone, setCheckInDone] = useState(false)
  const [habits,  setHabits]  = useState<ApiHabit[]>([])
  const [tasks,   setTasks]   = useState<ApiTask[]>([])
  const [loading, setLoading] = useState(true)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  const now       = new Date()
  const dayName   = format(now, 'EEEE', { locale: es })
  const dayLabel  = dayName.charAt(0).toUpperCase() + dayName.slice(1)
  const dateLabel = format(now, "d 'de' MMMM", { locale: es })
  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const load = useCallback(async () => {
    try {
      const [h, t] = await Promise.all([api.habits.list(), api.tasks.list()])
      setHabits(h.filter(x => x.is_active))
      setTasks(t.filter(x => x.status === 'pending'))
    } catch {
      // silent — empty state shown
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Pending habits for today
  const pendingHabits = habits.filter(h => {
    const log = h.logs.find(l => l.date === TODAY_ISO)
    return log?.status !== 'done'
  })

  // Build today items list
  const allItems: TodayItem[] = [
    ...pendingHabits.map(h => ({ kind: 'habit' as const, habit: h })),
    ...tasks.map(t => ({ kind: 'task' as const, task: t })),
  ]
  const visibleItems = allItems.filter(i => {
    const key = i.kind === 'habit' ? `h-${i.habit.id}` : `t-${i.task.id}`
    return !doneIds.has(key)
  })

  const markDone = useCallback((item: TodayItem) => {
    const key = item.kind === 'habit' ? `h-${item.habit.id}` : `t-${item.task.id}`
    setDoneIds(prev => new Set([...prev, key]))
    if (item.kind === 'habit') {
      api.habits.log(item.habit.id, TODAY_ISO, 'done').catch(() => {})
    } else {
      api.tasks.update(item.task.id, { status: 'done' }).catch(() => {})
    }
  }, [])

  const primaryItem = visibleItems[0] ?? null
  const restItems   = visibleItems.slice(1)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <View>
            <Text variant="displayLarge" color="primary">{dayLabel}</Text>
            <Text variant="body" color="secondary">{dateLabel}</Text>
          </View>
          <HStack gap="sm" style={{ alignItems: 'center' }}>
            <View style={styles.greetingTag}>
              <Text variant="micro" color="secondary">{greeting.toUpperCase()}</Text>
            </View>
            <Pressable onPress={() => router.push('/add')} style={styles.addBtn}>
              <Text variant="title" color="primary" style={{ lineHeight: 24 }}>+</Text>
            </Pressable>
          </HStack>
        </View>

        {!checkInDone && (
          <View style={styles.section}>
            <EnergyCheckIn onSubmit={() => setCheckInDone(true)} />
          </View>
        )}

        {loading ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={styles.section}>
            <EmptyDayState />
          </View>
        ) : (
          <>
            {primaryItem && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>AHORA</Text>
                <TodayCard item={primaryItem} onDone={() => markDone(primaryItem)} />
              </View>
            )}

            {restItems.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>MÁS TARDE</Text>
                <Card padding="none">
                  {restItems.map((item, i) => {
                    const key = item.kind === 'habit' ? `h-${item.habit.id}` : `t-${item.task.id}`
                    return (
                      <View key={key}>
                        <AgendaRow item={item} onDone={() => markDone(item)} />
                        {i < restItems.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                      </View>
                    )
                  })}
                </Card>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  content: { flexGrow: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  greetingTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginTop: Spacing.xs,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.yellow,
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },

  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },

  checkInWrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    shadowColor:   '#0A0A0A',
    shadowOffset:  { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     2,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 50,
  },
  chipSelected: {
    shadowColor:   '#0A0A0A',
    shadowOffset:  { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     2,
  },

  primaryCard:  { overflow: 'hidden' },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  durationPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface2,
  },

  agendaRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  stripe: { width: 4, height: 32, borderRadius: 2 },

  emptyCard: { gap: Spacing.xs },
})
