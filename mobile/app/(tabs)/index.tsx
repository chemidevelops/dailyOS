import { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Text, Card, PressableCard, Button, HStack, VStack, Divider } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { api, ApiActivity, ApiTask, ApiSettings, ApiGeneratedPlan } from '@/constants/api'

function minutesUntilSleep(settings: ApiSettings | null): number {
  if (!settings) return 999
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const [h, m] = settings.sleep_start.split(':').map(Number)
  const sleepMin = h * 60 + m
  return Math.max(0, sleepMin - nowMin)
}

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
  | { kind: 'activity'; activity: ApiActivity }
  | { kind: 'task';     task: ApiTask }

function TodayCard({ item, onDone }: { item: TodayItem; onDone: () => void }) {
  const router = useRouter()

  const title    = item.kind === 'activity' ? item.activity.title : item.task.title
  const color    = item.kind === 'activity' ? item.activity.color : item.task.color
  const minutes  = item.kind === 'activity' ? item.activity.duration_minutes : item.task.duration_minutes
  const typeLabel = item.kind === 'activity' ? 'ACTIVIDAD' : 'TAREA'

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
  const title  = item.kind === 'activity' ? item.activity.title : item.task.title
  const color  = item.kind === 'activity' ? item.activity.color : item.task.color
  const mins   = item.kind === 'activity' ? item.activity.duration_minutes : item.task.duration_minutes

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

// ─── Day guide modal ──────────────────────────────────────────────────────────

const KIND_COLOR: Record<string, string> = { activity: Colors.mint, task: Colors.indigo }
const KIND_LABEL: Record<string, string> = { activity: 'ACTIVIDAD', task: 'TAREA' }

function DayGuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [plan,    setPlan]    = useState<ApiGeneratedPlan | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    api.generate.plan().then(setPlan).catch(() => {}).finally(() => setLoading(false))
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
        <HStack style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: Colors.border }}>
          <Text variant="displayMedium" color="primary">Tu día</Text>
          <Pressable onPress={onClose}>
            <Text variant="captionMedium" color="secondary">Cerrar</Text>
          </Pressable>
        </HStack>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
          </View>
        ) : !plan || plan.items.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl }}>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>No hay nada planificado para hoy.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl }}>
            {plan.work_end && (
              <View style={guideStyles.nowLine}>
                <View style={guideStyles.nowDot} />
                <Text variant="micro" color="secondary">Trabajo hasta las {plan.work_end}</Text>
              </View>
            )}
            {plan.items.map((item, i) => (
              <View key={`${item.kind}-${item.id}`} style={guideStyles.row}>
                <View style={guideStyles.timeCol}>
                  {item.start_time && (
                    <>
                      <Text variant="captionMedium" color="primary">{item.start_time}</Text>
                      <Text variant="micro" color="tertiary">{item.end_time}</Text>
                    </>
                  )}
                </View>
                <View style={[guideStyles.stripe, { backgroundColor: item.color }]} />
                <VStack gap="xs" style={{ flex: 1 }}>
                  <View style={[guideStyles.badge, { borderColor: (KIND_COLOR[item.kind] ?? Colors.border) + '60' }]}>
                    <Text variant="micro" customColor={KIND_COLOR[item.kind] ?? Colors.textTertiary}>{KIND_LABEL[item.kind] ?? item.kind.toUpperCase()}</Text>
                  </View>
                  <Text variant="bodyMedium" color="primary" numberOfLines={2}>{item.title}</Text>
                  {item.activity_title && (
                    <Text variant="micro" color="tertiary">vía {item.activity_title}</Text>
                  )}
                </VStack>
                <Text variant="micro" color="tertiary">{item.duration_minutes}m</Text>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const guideStyles = StyleSheet.create({
  nowLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  nowDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textTertiary },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  timeCol: { width: 52, alignItems: 'flex-start' },
  stripe:  { width: 4, height: 44, borderRadius: 2 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs + 2, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1.5, marginBottom: 2,
  },
})

function EmptyDayState({ freeMinutes }: { freeMinutes: number }) {
  const router = useRouter()
  return (
    <Card variant="highlighted" style={styles.emptyCard}>
      <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>
        Día en blanco
      </Text>
      <Text variant="body" color="secondary" style={{ marginBottom: Spacing.lg }}>
        {freeMinutes < 30
          ? 'Ya es tarde. Disfruta el descanso.'
          : 'Añade actividades o tareas para empezar a planificar tu día.'}
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
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [checkInDone,  setCheckInDone]  = useState(false)
  const [showDayGuide, setShowDayGuide] = useState(false)
  const [activities,   setActivities]   = useState<ApiActivity[]>([])
  const [tasks,        setTasks]        = useState<ApiTask[]>([])
  const [settings,     setSettings]     = useState<ApiSettings | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [doneIds,      setDoneIds]      = useState<Set<string>>(new Set())

  const now       = new Date()
  const dayName   = format(now, 'EEEE', { locale: es })
  const dayLabel  = dayName.charAt(0).toUpperCase() + dayName.slice(1)
  const dateLabel = format(now, "d 'de' MMMM", { locale: es })
  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const load = useCallback(async () => {
    try {
      const [a, t, s] = await Promise.all([api.activities.list(), api.tasks.list(), api.settings.get()])
      setActivities(a.filter(x => x.is_active))
      setTasks(t.filter(x => x.status === 'pending'))
      setSettings(s)
    } catch {
      // silent — empty state shown
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const freeMinutes = minutesUntilSleep(settings)

  const pendingActivities = activities.filter(a => {
    const log = a.logs.find(l => l.date === TODAY_ISO)
    const notDone = log?.status !== 'done'
    const fitsInTime = a.duration_minutes <= freeMinutes
    return notDone && fitsInTime
  })

  const pendingTasks = tasks.filter(t => t.duration_minutes <= freeMinutes)

  const allItems: TodayItem[] = [
    ...pendingActivities.map(a => ({ kind: 'activity' as const, activity: a })),
    ...pendingTasks.map(t => ({ kind: 'task' as const, task: t })),
  ]
  const visibleItems = allItems.filter(i => {
    const key = i.kind === 'activity' ? `a-${i.activity.id}` : `t-${i.task.id}`
    return !doneIds.has(key)
  })

  const markDone = useCallback((item: TodayItem) => {
    const key = item.kind === 'activity' ? `a-${item.activity.id}` : `t-${item.task.id}`
    setDoneIds(prev => new Set([...prev, key]))
    if (item.kind === 'activity') {
      api.activities.log(item.activity.id, TODAY_ISO, 'done').catch(() => {})
    } else {
      api.tasks.update(item.task.id, { status: 'done' }).catch(() => {})
    }
  }, [])

  const primaryItem = visibleItems[0] ?? null
  const restItems   = visibleItems.slice(1)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <View>
            <Text variant="displayLarge" color="primary">{dayLabel}</Text>
            <Text variant="body" color="secondary">{dateLabel}</Text>
          </View>
          <HStack gap="sm" style={{ alignItems: 'center' }}>
            <Pressable onPress={() => setShowDayGuide(true)} style={styles.greetingTag}>
              <Text variant="micro" color="secondary">VER DÍA</Text>
            </Pressable>
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
            <EmptyDayState freeMinutes={freeMinutes} />
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
                    const key = item.kind === 'activity' ? `a-${item.activity.id}` : `t-${item.task.id}`
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

      <DayGuideModal visible={showDayGuide} onClose={() => setShowDayGuide(false)} />
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
