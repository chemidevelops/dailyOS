import { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Text, Card, PressableCard, Button, HStack, VStack, Divider } from '@/components/ui'
import { Colors, Spacing, Radius, FontWeight } from '@/constants/tokens'
import { api, ApiGeneratedItem, ApiGeneratedPlan } from '@/constants/api'

const TODAY_ISO = new Date().toISOString().split('T')[0]

// ─── Energy check-in ──────────────────────────────────────────────────────────

type Energy = 'high' | 'normal' | 'low'

function EnergyCheckIn({ onSubmit }: { onSubmit: (e: Energy) => void }) {
  const OPTIONS: { value: Energy; label: string; bg: string }[] = [
    { value: 'high',   label: 'ACTIVO',    bg: Colors.yellow    },
    { value: 'normal', label: 'NORMAL',    bg: Colors.surface   },
    { value: 'low',    label: 'TRANQUILO', bg: Colors.mintLight },
  ]
  return (
    <View style={styles.checkInWrap}>
      <Text variant="micro" color="secondary" style={{ marginBottom: Spacing.sm }}>¿CÓMO ESTÁS HOY?</Text>
      <HStack gap="sm">
        {OPTIONS.map(opt => (
          <Pressable key={opt.value} onPress={() => onSubmit(opt.value)}
            style={[styles.chip, { backgroundColor: opt.bg }]}>
            <Text variant="captionMedium" color="primary">{opt.label}</Text>
          </Pressable>
        ))}
      </HStack>
    </View>
  )
}

// ─── Plan item cards ──────────────────────────────────────────────────────────

function PrimaryCard({ item, onDone }: { item: ApiGeneratedItem; onDone: () => void }) {
  const router = useRouter()
  const typeLabel = item.kind === 'activity' ? 'ACTIVIDAD' : 'TAREA'

  return (
    <PressableCard variant="elevated" style={styles.primaryCard} onPress={() => {}}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
        <View style={[styles.typeBadge, { backgroundColor: item.color }]}>
          <Text variant="micro" customColor="#fff">{typeLabel}</Text>
        </View>
        <View style={styles.durationPill}>
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
        <Button label="Hecho" variant="ghost" size="sm" onPress={onDone} />
        {item.duration_minutes > 0 && (
          <Button label="Empezar →" variant="secondary" size="sm" onPress={() =>
            router.push({ pathname: '/focus', params: { title: item.title, minutes: String(item.duration_minutes), color: item.color } })
          } />
        )}
      </HStack>
    </PressableCard>
  )
}

function AgendaRow({ item, onDone }: { item: ApiGeneratedItem; onDone: () => void }) {
  const [done, setDone] = useState(false)
  const handle = () => { setDone(true); setTimeout(onDone, 300) }

  return (
    <HStack style={[styles.agendaRow, done && { opacity: 0.3 }]} gap="md">
      <Pressable onPress={handle} hitSlop={12}>
        <View style={[styles.check, done && { backgroundColor: Colors.mint, borderColor: Colors.mint }]}>
          {done && <Text variant="micro" color="inverse">✓</Text>}
        </View>
      </Pressable>
      <View style={[styles.stripe, { backgroundColor: item.color }]} />
      <VStack gap="xs" style={{ flex: 1 }}>
        <Text variant="bodyMedium"
          customColor={done ? Colors.textTertiary : Colors.textPrimary}
          style={done ? { textDecorationLine: 'line-through' } : undefined}
          numberOfLines={1}>
          {item.title}
        </Text>
        {item.activity_title && (
          <Text variant="micro" color="tertiary">vía {item.activity_title}</Text>
        )}
      </VStack>
      {item.start_time && (
        <Text variant="micro" color="tertiary">{item.start_time}</Text>
      )}
      <Text variant="micro" color="tertiary">{item.duration_minutes}m</Text>
    </HStack>
  )
}

// ─── Day guide modal ──────────────────────────────────────────────────────────

function DayGuideModal({ visible, plan, onClose }: { visible: boolean; plan: ApiGeneratedPlan | null; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
        <HStack style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: Colors.border }}>
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
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textTertiary }} />
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
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [energy,       setEnergy]       = useState<Energy | null>(null)
  const [showDayGuide, setShowDayGuide] = useState(false)
  const [plan,         setPlan]         = useState<ApiGeneratedPlan | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [doneIds,      setDoneIds]      = useState<Set<string>>(new Set())

  const now       = new Date()
  const dayName   = format(now, 'EEEE', { locale: es })
  const dayLabel  = dayName.charAt(0).toUpperCase() + dayName.slice(1)
  const dateLabel = format(now, "d 'de' MMMM", { locale: es })

  const load = useCallback(async () => {
    try {
      const data = await api.generate.plan()
      setPlan(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const markDone = useCallback((item: ApiGeneratedItem) => {
    const key = `${item.kind}-${item.id}`
    setDoneIds(prev => new Set([...prev, key]))
    if (item.kind === 'activity') {
      api.activities.log(item.id, TODAY_ISO, 'done', item.item_id ?? undefined).catch(() => {})
    } else {
      api.tasks.update(item.id, { status: 'done' }).catch(() => {})
    }
  }, [])

  const visibleItems = (plan?.items ?? []).filter(i => !doneIds.has(`${i.kind}-${i.id}`))
  const primaryItem  = visibleItems[0] ?? null
  const restItems    = visibleItems.slice(1)

  const freeMinutes  = plan ? plan.free_minutes - plan.planned_minutes : 0

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

        {!energy && (
          <View style={styles.section}>
            <EnergyCheckIn onSubmit={setEnergy} />
          </View>
        )}

        {loading ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
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
            {primaryItem && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>AHORA</Text>
                <PrimaryCard item={primaryItem} onDone={() => markDone(primaryItem)} />
              </View>
            )}

            {restItems.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>MÁS TARDE</Text>
                <Card padding="none">
                  {restItems.map((item, i) => {
                    const key = `${item.kind}-${item.id}-${i}`
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

      <DayGuideModal visible={showDayGuide} plan={plan} onClose={() => setShowDayGuide(false)} />
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
    borderColor: Colors.border,
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
})
