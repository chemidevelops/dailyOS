import { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Text, Card, HStack, VStack } from '@/components/ui'
import { Spacing, Radius, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { api, ApiGeneratedPlan, ApiGeneratedItem } from '@/constants/api'

const KIND_LABEL: Record<string, string> = {
  activity: 'ACTIVIDAD', task: 'TAREA',
}

function PlanItem({ item, index, total, onDelete, onMove }: {
  item: ApiGeneratedItem
  index: number
  total: number
  onDelete: (item: ApiGeneratedItem) => void
  onMove: (index: number, direction: -1 | 1) => void
}) {
  const C = useColors()
  const kindColor = item.kind === 'activity' ? C.mint : C.indigo

  const confirmDelete = () => {
    const label = item.kind === 'task' ? 'tarea' : 'actividad'
    Alert.alert(`Borrar ${label}`, `¿Borrar "${item.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => onDelete(item) },
    ])
  }

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
        <View style={[styles.kindBadge, { backgroundColor: kindColor + '25', borderColor: kindColor }]}>
          <Text variant="micro" customColor={kindColor}>{KIND_LABEL[item.kind]}</Text>
        </View>
        <Text variant="bodyMedium" color="primary" numberOfLines={2}>{item.title}</Text>
        {item.activity_title && (
          <Text variant="micro" color="tertiary">vía {item.activity_title}</Text>
        )}
      </VStack>

      <Text variant="micro" color="tertiary">{item.duration_minutes}m</Text>

      <VStack gap="xs" style={{ alignItems: 'center' }}>
        <Pressable onPress={() => onMove(index, -1)} hitSlop={8} disabled={index === 0}
          style={{ opacity: index === 0 ? 0.2 : 1 }}>
          <Text variant="micro" color="tertiary">▲</Text>
        </Pressable>
        <Pressable onPress={() => onMove(index, 1)} hitSlop={8} disabled={index === total - 1}
          style={{ opacity: index === total - 1 ? 0.2 : 1 }}>
          <Text variant="micro" color="tertiary">▼</Text>
        </Pressable>
      </VStack>

      <Pressable onPress={confirmDelete} hitSlop={12}>
        <Text variant="body" customColor={C.textTertiary}>×</Text>
      </Pressable>
    </HStack>
  )
}

function CapacityBar({ plan }: { plan: ApiGeneratedPlan }) {
  const C = useColors()
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
      <View style={[styles.barTrack, { backgroundColor: C.border }]}>
        <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: C.textPrimary }]} />
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

function isoDate(offset: number = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, c => c.toUpperCase())
}

export default function PlanScreen() {
  const C = useColors()
  const insets  = useSafeAreaInsets()
  const [offset,  setOffset]  = useState(0)
  const [plan,    setPlan]    = useState<ApiGeneratedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (dayOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.generate.plan(isoDate(dayOffset))
      setPlan(data)
    } catch {
      setError('No se pudo generar el plan.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = async (item: ApiGeneratedItem) => {
    setPlan(prev => prev ? { ...prev, items: prev.items.filter(i => !(i.id === item.id && i.kind === item.kind)) } : prev)
    try {
      if (item.kind === 'task') {
        await api.tasks.delete(item.id)
      } else {
        await api.activities.update(item.id, { is_active: false })
      }
    } catch {
      load(offset)
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!plan) return
    const newItems = [...plan.items]
    const swapIdx = index + direction
    if (swapIdx < 0 || swapIdx >= newItems.length) return
    ;[newItems[index], newItems[swapIdx]] = [newItems[swapIdx], newItems[index]]
    // Recalculate start/end times
    let cursor = plan.free_minutes  // doesn't matter for display, backend recalculates
    setPlan(prev => prev ? { ...prev, items: newItems } : prev)
    // Persist order
    const order = newItems.map(i => `${i.kind}-${i.id}`)
    api.settings.update({ plan_order: JSON.stringify(order) }).catch(() => {})
  }

  useFocusEffect(useCallback(() => { load(offset) }, [load, offset]))
  useEffect(() => { load(offset) }, [offset])

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <View>
            <Text variant="displayLarge" color="primary">{offset === 0 ? 'Plan' : 'Mañana'}</Text>
            <Text variant="body" color="secondary">{dayLabel(offset)}</Text>
          </View>
          <HStack gap="xs" style={[styles.dayToggle, { backgroundColor: C.surface, borderColor: C.border }]}>
            {[{ label: 'HOY', val: 0 }, { label: 'MAÑANA', val: 1 }].map(({ label, val }) => (
              <Pressable
                key={val}
                onPress={() => setOffset(val)}
                style={[styles.toggleChip, offset === val && { backgroundColor: C.textPrimary }]}
              >
                <Text variant="micro" customColor={offset === val ? C.textInverse : C.textSecondary}
                  style={offset === val ? { fontWeight: FontWeight.bold } : undefined}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </View>

        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={C.textPrimary} />
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
                    <View style={[styles.stripe, { backgroundColor: C.border }]} />
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
                    <PlanItem item={item} index={i} total={plan.items.length} onDelete={handleDelete} onMove={handleMove} />
                    {i < plan.items.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
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
  safe:    { flex: 1 },
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
    borderRadius: Radius.full,
    borderWidth: 1.5,
    padding: 3,
  },
  toggleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
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
    overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 4,
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
    opacity: 0.15,
    marginHorizontal: Spacing.lg,
  },
})
