import { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Text, Card, PressableCard, Button, HStack, VStack, Divider } from '@/components/ui'
import { Spacing, Radius, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { useTheme } from '@/contexts/ThemeContext'
import { api, ApiGeneratedItem, ApiGeneratedPlan } from '@/constants/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CHECKIN_KEY = '@dailyos_checkin'

const TODAY_ISO = new Date().toISOString().split('T')[0]

// ─── Energy check-in ──────────────────────────────────────────────────────────

type Energy = 'high' | 'normal' | 'low'
type Availability = 'full' | 'normal' | 'busy'

const AVAILABILITY_PCT: Record<Availability, number> = {
  full:   90,
  normal: 60,
  busy:   30,
}

function CheckIn({ onSubmit }: { onSubmit: (e: Energy, a: Availability) => void }) {
  const C = useColors()
  const [energy, setEnergy] = useState<Energy | null>(null)

  const ENERGY_OPTS: { value: Energy; label: string; bg: string }[] = [
    { value: 'high',   label: 'ACTIVO',    bg: C.yellow    },
    { value: 'normal', label: 'NORMAL',    bg: C.surface   },
    { value: 'low',    label: 'TRANQUILO', bg: C.mintLight },
  ]
  const AVAIL_OPTS: { value: Availability; label: string; sub: string }[] = [
    { value: 'full',   label: 'LIBRE',   sub: 'Toda la tarde para mí' },
    { value: 'normal', label: 'NORMAL',  sub: 'Tengo alguna cosa'     },
    { value: 'busy',   label: 'OCUPADO', sub: 'Poco rato'             },
  ]

  return (
    <View style={[styles.checkInWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
      {!energy ? (
        <>
          <Text variant="micro" color="secondary" style={{ marginBottom: Spacing.sm }}>¿CÓMO ESTÁS HOY?</Text>
          <HStack gap="sm">
            {ENERGY_OPTS.map(opt => (
              <Pressable key={opt.value} onPress={() => setEnergy(opt.value)}
                style={[styles.chip, { backgroundColor: opt.bg, borderColor: C.border }]}>
                <Text variant="captionMedium" color="primary">{opt.label}</Text>
              </Pressable>
            ))}
          </HStack>
        </>
      ) : (
        <>
          <Text variant="micro" color="secondary" style={{ marginBottom: Spacing.sm }}>¿CUÁNTO TIEMPO TIENES?</Text>
          <VStack gap="sm">
            {AVAIL_OPTS.map(opt => (
              <Pressable key={opt.value} onPress={() => onSubmit(energy, opt.value)}
                style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: Radius.md,
                  backgroundColor: C.surface, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md }}>
                <HStack gap="sm" style={{ alignItems: 'center' }}>
                  <Text variant="captionMedium" color="primary">{opt.label}</Text>
                  <Text variant="micro" color="tertiary">{opt.sub}</Text>
                </HStack>
              </Pressable>
            ))}
          </VStack>
        </>
      )}
    </View>
  )
}

// ─── Plan item cards ──────────────────────────────────────────────────────────

function PrimaryCard({ item, onDone, onSkip }: { item: ApiGeneratedItem; onDone: () => void; onSkip: () => void }) {
  const C = useColors()
  const router = useRouter()
  const typeLabel = item.kind === 'activity' ? 'ACTIVIDAD' : 'TAREA'

  return (
    <PressableCard variant="elevated" style={styles.primaryCard} onPress={() => {}}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
        <View style={[styles.typeBadge, { backgroundColor: item.color }]}>
          <Text variant="micro" customColor="#fff">{typeLabel}</Text>
        </View>
        <View style={[styles.durationPill, { borderColor: C.borderLight, backgroundColor: C.surface2 }]}>
          <Text variant="micro" color="secondary">{item.duration_minutes} MIN</Text>
        </View>
      </HStack>

      <Text variant="displayMedium" color="primary" numberOfLines={2} style={{ marginBottom: Spacing.xs }}>
        {item.title}
      </Text>
      {item.activity_title && (
        <Text variant="body" color="secondary" style={{ marginBottom: Spacing.lg }}>
          vía {item.activity_title}
        </Text>
      )}

      <HStack style={{ justifyContent: 'flex-end' }} gap="sm">
        <Button label="Saltar" variant="ghost" size="sm" onPress={onSkip} />
        <Button label="Hecho" variant="ghost" size="sm" onPress={onDone} />
        {item.duration_minutes > 0 && (
          <Button label="Empezar →" variant="secondary" size="sm" onPress={() =>
            router.push({ pathname: '/focus', params: {
              title: item.title,
              minutes: String(item.duration_minutes),
              color: item.color,
              activityId: item.kind === 'activity' ? String(item.id) : undefined,
              itemId: item.item_id != null ? String(item.item_id) : undefined,
            }})
          } />
        )}
      </HStack>
    </PressableCard>
  )
}

function AgendaRow({ item, onDone, onSkip }: { item: ApiGeneratedItem; onDone: () => void; onSkip: () => void }) {
  const C = useColors()
  const [done, setDone] = useState(false)
  const handle = () => { setDone(true); setTimeout(onDone, 300) }

  return (
    <HStack style={[styles.agendaRow, done && { opacity: 0.3 }]} gap="md">
      <Pressable onPress={handle} hitSlop={12}>
        <View style={[styles.check, { borderColor: C.border, backgroundColor: C.surface },
          done && { backgroundColor: C.mint, borderColor: C.mint }]}>
          {done && <Text variant="micro" color="inverse">✓</Text>}
        </View>
      </Pressable>
      <View style={[styles.stripe, { backgroundColor: item.color }]} />
      <VStack gap="xs" style={{ flex: 1 }}>
        <Text variant="bodyMedium"
          customColor={done ? C.textTertiary : C.textPrimary}
          style={done ? { textDecorationLine: 'line-through' } : undefined}
          numberOfLines={1}>
          {item.title}
        </Text>
        {item.activity_title && (
          <Text variant="micro" color="tertiary">vía {item.activity_title}</Text>
        )}
        {item.next_item_title && (
          <Text variant="micro" color="tertiary">Siguiente: {item.next_item_title}</Text>
        )}
      </VStack>
      {item.start_time && (
        <Text variant="micro" color="tertiary">{item.start_time}</Text>
      )}
      <Text variant="micro" color="tertiary">{item.duration_minutes}m</Text>
      <Pressable onPress={onSkip} hitSlop={12}>
        <Text variant="micro" color="tertiary">Saltar</Text>
      </Pressable>
    </HStack>
  )
}

// ─── Day guide modal ──────────────────────────────────────────────────────────

function DayGuideModal({ visible, plan, onClose }: { visible: boolean; plan: ApiGeneratedPlan | null; onClose: () => void }) {
  const C = useColors()
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <HStack style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: C.border }}>
          <Text variant="displayMedium" color="primary">Tu día</Text>
          <Pressable onPress={onClose}>
            <Text variant="captionMedium" color="secondary">Cerrar</Text>
          </Pressable>
        </HStack>

        {!plan || plan.items.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl }}>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>No hay nada planificado para hoy.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl }}>
            {plan.work_end && (
              <HStack gap="sm" style={{ marginBottom: Spacing.lg, alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.textTertiary }} />
                <Text variant="micro" color="secondary">Trabajo hasta las {plan.work_end}</Text>
              </HStack>
            )}
            {plan.items.map((item, i) => (
              <HStack key={`${item.kind}-${item.id}-${i}`} style={{ marginBottom: Spacing.lg, alignItems: 'center' }} gap="md">
                <View style={{ width: 52 }}>
                  {item.start_time && (
                    <VStack gap="xs">
                      <Text variant="captionMedium" color="primary">{item.start_time}</Text>
                      <Text variant="micro" color="tertiary">{item.end_time}</Text>
                    </VStack>
                  )}
                </View>
                <View style={{ width: 4, height: 44, borderRadius: 2, backgroundColor: item.color }} />
                <VStack gap="xs" style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color="primary" numberOfLines={2}>{item.title}</Text>
                  {item.activity_title && <Text variant="micro" color="tertiary">vía {item.activity_title}</Text>}
                </VStack>
                <Text variant="micro" color="tertiary">{item.duration_minutes}m</Text>
              </HStack>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const C = useColors()
  const { isDark, setMode } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [energy,       setEnergy]       = useState<Energy | null>(null)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [checkInReady, setCheckInReady] = useState(false)
  const [showDayGuide, setShowDayGuide] = useState(false)
  const [plan,         setPlan]         = useState<ApiGeneratedPlan | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [doneIds,      setDoneIds]      = useState<Set<string>>(new Set())

  const now       = new Date()
  const dayName   = format(now, 'EEEE', { locale: es })
  const dayLabel  = dayName.charAt(0).toUpperCase() + dayName.slice(1)
  const dateLabel = format(now, "d 'de' MMMM", { locale: es })

  useEffect(() => {
    AsyncStorage.getItem(CHECKIN_KEY).then(raw => {
      if (!raw) { setCheckInReady(true); return }
      try {
        const { date, energy: e, availability: a } = JSON.parse(raw)
        if (date === TODAY_ISO) {
          setEnergy(e)
          setAvailability(a)
        }
      } catch {}
      setCheckInReady(true)
    })
  }, [])

  const saveCheckIn = (e: Energy, a: Availability) => {
    AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify({ date: TODAY_ISO, energy: e, availability: a }))
  }

  const resetCheckIn = () => {
    setEnergy(null)
    setAvailability(null)
    AsyncStorage.removeItem(CHECKIN_KEY)
  }

  const load = useCallback(async (e?: Energy | null, a?: Availability | null) => {
    try {
      const fillPct = a ? AVAILABILITY_PCT[a] : undefined
      const data = await api.generate.plan(undefined, e ?? undefined, fillPct)
      setPlan(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    if (!checkInReady) return
    load(energy, availability)
  }, [load, energy, availability, checkInReady]))

  const markDone = useCallback((item: ApiGeneratedItem) => {
    const key = `${item.kind}-${item.id}`
    setDoneIds(prev => new Set([...prev, key]))
    if (item.kind === 'activity') {
      api.activities.log(item.id, TODAY_ISO, 'done', item.item_id ?? undefined).catch(() => {})
    } else {
      api.tasks.update(item.id, { status: 'done' }).catch(() => {})
    }
  }, [])

  const markSkipped = useCallback((item: ApiGeneratedItem) => {
    const key = `${item.kind}-${item.id}`
    setDoneIds(prev => new Set([...prev, key]))
    if (item.kind === 'activity') {
      api.activities.log(item.id, TODAY_ISO, 'skipped', item.item_id ?? undefined).catch(() => {})
    }
  }, [])

  const visibleItems = (plan?.items ?? []).filter(i => !doneIds.has(`${i.kind}-${i.id}`))

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const workEndMin = plan?.work_end
    ? parseInt(plan.work_end.split(':')[0]) * 60 + parseInt(plan.work_end.split(':')[1])
    : 0
  const workStartMin = plan?.work_start
    ? parseInt(plan.work_start.split(':')[0]) * 60 + parseInt(plan.work_start.split(':')[1])
    : 0
  const isWorkingNow = !!(plan?.work_end && nowMin >= workStartMin && nowMin < workEndMin)

  const primaryItem = isWorkingNow ? null : (visibleItems[0] ?? null)
  const restItems   = isWorkingNow ? visibleItems : visibleItems.slice(1)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <View>
            <Text variant="displayLarge" color="primary">{dayLabel}</Text>
            <Text variant="body" color="secondary">{dateLabel}</Text>
          </View>
          <HStack gap="sm" style={{ alignItems: 'center' }}>
            <Pressable onPress={() => setMode(isDark ? 'light' : 'dark')}
              style={[styles.greetingTag, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Text variant="micro" color="secondary">{isDark ? '☀️' : '🌙'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowDayGuide(true)}
              style={[styles.greetingTag, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Text variant="micro" color="secondary">VER DÍA</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/add')}
              style={[styles.addBtn, { borderColor: C.border, backgroundColor: C.yellow }]}>
              <Text variant="title" color="primary" style={{ lineHeight: 24 }}>+</Text>
            </Pressable>
          </HStack>
        </View>

        {checkInReady && (!energy || !availability) && (
          <View style={styles.section}>
            <CheckIn onSubmit={(e, a) => {
              setEnergy(e)
              setAvailability(a)
              saveCheckIn(e, a)
              setLoading(true)
              load(e, a)
            }} />
          </View>
        )}

        {energy && availability && (
          <View style={[styles.section, { marginTop: -Spacing.sm }]}>
            <HStack style={{ justifyContent: 'flex-end' }}>
              <Pressable onPress={resetCheckIn}
                style={{ paddingHorizontal: Spacing.sm, paddingVertical: 2 }}>
                <Text variant="micro" color="tertiary">Cambiar día ↺</Text>
              </Pressable>
            </HStack>
          </View>
        )}

        {loading ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.textPrimary} />
          </View>
        ) : plan?.is_vacation ? (
          <View style={styles.section}>
            <Card variant="highlighted" style={{ gap: Spacing.xs }}>
              <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>Día de descanso 🌴</Text>
              <Text variant="body" color="secondary">Disfruta el día libre.</Text>
            </Card>
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={styles.section}>
            <Card variant="highlighted" style={{ gap: Spacing.xs }}>
              <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>
                {plan && plan.free_minutes < 30 ? 'Hora de descansar' : 'Todo al día'}
              </Text>
              <Text variant="body" color="secondary" style={{ marginBottom: Spacing.lg }}>
                {plan && plan.free_minutes < 30
                  ? 'Ya es tarde. Disfruta el descanso.'
                  : 'No hay nada pendiente para hoy. Añade actividades o tareas.'}
              </Text>
              {(!plan || plan.free_minutes >= 30) && (
                <Button label="Añadir algo +" variant="primary" size="md" onPress={() => router.push('/add')} />
              )}
            </Card>
          </View>
        ) : (
          <>
            {isWorkingNow && plan?.work_end && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>AHORA</Text>
                <Card variant="elevated">
                  <HStack gap="md" style={{ alignItems: 'center' }}>
                    <View style={{ width: 4, height: 44, borderRadius: 2, backgroundColor: C.border }} />
                    <VStack gap="xs" style={{ flex: 1 }}>
                      <Text variant="displayMedium" color="primary">Trabajo</Text>
                      <Text variant="body" color="secondary">Hasta las {plan.work_end}</Text>
                    </VStack>
                  </HStack>
                </Card>
              </View>
            )}

            {primaryItem && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>AHORA</Text>
                <PrimaryCard item={primaryItem} onDone={() => markDone(primaryItem)} onSkip={() => markSkipped(primaryItem)} />
              </View>
            )}

            {restItems.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>
                  {isWorkingNow ? 'DESPUÉS DEL TRABAJO' : 'MÁS TARDE'}
                </Text>
                <Card padding="none">
                  {restItems.map((item, i) => {
                    const key = `${item.kind}-${item.id}-${i}`
                    return (
                      <View key={key}>
                        <AgendaRow item={item} onDone={() => markDone(item)} onSkip={() => markSkipped(item)} />
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

      <DayGuideModal visible={showDayGuide} plan={plan} onClose={() => setShowDayGuide(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
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
    marginTop: Spacing.xs,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },

  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },

  checkInWrap: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.lg,
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minHeight: 50,
  },

  primaryCard: { overflow: 'hidden' },
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
  },

  agendaRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stripe: { width: 4, height: 32, borderRadius: 2 },
})
