import { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Text, Card, HStack, VStack } from '@/components/ui'
import { Colors, Spacing, Radius, FontWeight } from '@/constants/tokens'
import { api, ApiGeneratedPlan, ApiGeneratedItem } from '@/constants/api'

const KIND_LABEL: Record<string, string> = {
  activity: 'ACTIVIDAD', task: 'TAREA',
}
const KIND_COLOR: Record<string, string> = {
  activity: Colors.mint, task: Colors.indigo,
}

function PlanItem({ item }: { item: ApiGeneratedItem }) {
  return (
    <HStack style={styles.planRow} gap="md">
      <View style={styles.timeCol}>
        {item.start_time ? (
          <>
            <Text variant="captionMedium" color="primary">{item.start_time}</Text>
            <Text variant="micro" color="tertiary">{item.end_time}</Text>
          </>
        ) : (
          <Text variant="micro" color="tertiary">—</Text>
        )}
      </View>

      <View style={[styles.stripe, { backgroundColor: item.color }]} />

      <VStack gap="xs" style={{ flex: 1 }}>
        <View style={[styles.kindBadge, { backgroundColor: KIND_COLOR[item.kind] + '25', borderColor: KIND_COLOR[item.kind] }]}>
          <Text variant="micro" customColor={KIND_COLOR[item.kind]}>{KIND_LABEL[item.kind]}</Text>
        </View>
        <Text variant="bodyMedium" color="primary" numberOfLines={2}>{item.title}</Text>
        {item.activity_title && (
          <Text variant="micro" color="tertiary">vía {item.activity_title}</Text>
        )}
      </VStack>

      <Text variant="micro" color="tertiary">{item.duration_minutes}m</Text>
    </HStack>
  )
}

function CapacityBar({ plan }: { plan: ApiGeneratedPlan }) {
  const pct   = plan.free_minutes > 0 ? Math.round((plan.planned_minutes / plan.free_minutes) * 100) : 0
  const freeH = Math.floor(plan.free_minutes / 60)
  const freeM = plan.free_minutes % 60
  const planH = Math.floor(plan.planned_minutes / 60)
  const planM = plan.planned_minutes % 60

  return (
    <Card variant="yellow" padding="md" style={{ marginBottom: Spacing.lg }}>
      <HStack style={{ justifyContent: 'space-between', marginBottom: Spacing.md }}>
        <VStack gap="xs">
          <Text variant="displayMedium" color="primary">{planH}h {planM}m</Text>
          <Text variant="micro" color="secondary">PLANIFICADO</Text>
        </VStack>
        <VStack gap="xs" style={{ alignItems: 'flex-end' }}>
          <Text variant="displayMedium" color="primary">{freeH}h {freeM}m</Text>
          <Text variant="micro" color="secondary">TIEMPO LIBRE</Text>
        </VStack>
      </HStack>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` }]} />
      </View>
      {plan.work_end && (
        <Text variant="micro" color="secondary" style={{ marginTop: Spacing.sm }}>
          Tu tiempo libre empieza a las {plan.work_end}
        </Text>
      )}
    </Card>
  )
}

function EmptyPlan() {
  return (
    <View style={styles.emptyWrap}>
      <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>Plan vacío</Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
        Añade hábitos o tareas desde la pestaña de hoy para que aparezcan aquí.
      </Text>
    </View>
  )
}

function isoDate(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function dayLabel(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, c => c.toUpperCase())
}

export default function PlanScreen() {
  const insets  = useSafeAreaInsets()
  const [offset,  setOffset]  = useState(0)  // 0 = today, 1 = tomorrow
  const [plan,    setPlan]    = useState<ApiGeneratedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (dayOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.generate.plan(dayOffset === 0 ? undefined : isoDate(dayOffset))
      setPlan(data)
    } catch {
      setError('No se pudo generar el plan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load(offset) }, [load, offset]))

  useEffect(() => { load(offset) }, [offset])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <View>
            <Text variant="displayLarge" color="primary">{offset === 0 ? 'Plan' : 'Mañana'}</Text>
            <Text variant="body" color="secondary">{dayLabel(offset)}</Text>
          </View>
          <HStack gap="xs" style={styles.dayToggle}>
            {[{ label: 'HOY', val: 0 }, { label: 'MAÑANA', val: 1 }].map(({ label, val }) => (
              <Pressable
                key={val}
                onPress={() => setOffset(val)}
                style={[styles.toggleChip, offset === val && styles.toggleChipActive]}
              >
                <Text variant="micro" customColor={offset === val ? Colors.textInverse : Colors.textSecondary}
                  style={offset === val ? { fontWeight: FontWeight.bold } : undefined}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </View>

        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>{error}</Text>
          </View>
        ) : !plan || plan.items.length === 0 ? (
          <View style={styles.section}>
            <EmptyPlan />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <CapacityBar plan={plan} />
            </View>

            {plan.work_start && plan.work_end && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>TRABAJO</Text>
                <Card padding="none" variant="flat">
                  <HStack style={styles.planRow} gap="md">
                    <View style={styles.timeCol}>
                      <Text variant="captionMedium" color="primary">{plan.work_start}</Text>
                      <Text variant="micro" color="tertiary">{plan.work_end}</Text>
                    </View>
                    <View style={[styles.stripe, { backgroundColor: Colors.border }]} />
                    <Text variant="bodyMedium" color="tertiary" style={{ flex: 1 }}>Trabajo</Text>
                  </HStack>
                </Card>
              </View>
            )}

            <View style={styles.section}>
              <Text variant="micro" color="secondary" style={styles.sectionLabel}>TIEMPO LIBRE</Text>
              <Card padding="none">
                {plan.items.map((item, i) => (
                  <View key={`${item.kind}-${item.id}`}>
                    <PlanItem item={item} />
                    {i < plan.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayToggle: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 3,
  },
  toggleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  toggleChipActive: {
    backgroundColor: Colors.textPrimary,
  },
  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
  },

  barTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: Colors.textPrimary,
  },

  planRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  timeCol: {
    width: 52,
    alignItems: 'flex-start',
  },
  stripe: {
    width: 4, height: 40, borderRadius: 2,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginBottom: 2,
  },
  divider: {
    height: 1.5,
    backgroundColor: Colors.border,
    opacity: 0.15,
    marginHorizontal: Spacing.lg,
  },
})
