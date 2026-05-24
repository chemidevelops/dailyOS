import { useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Text, Card, HStack, VStack } from '@/components/ui'
import { Colors, Spacing, Radius } from '@/constants/tokens'
import { api, ApiGeneratedPlan, ApiGeneratedItem } from '@/constants/api'

const KIND_LABEL: Record<string, string> = {
  habit: 'HÁBITO', task: 'TAREA', leisure: 'OCIO',
}
const KIND_COLOR: Record<string, string> = {
  habit: Colors.mint, task: Colors.indigo, leisure: Colors.coral,
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

export default function PlanScreen() {
  const [plan,    setPlan]    = useState<ApiGeneratedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await api.generate.plan()
      setPlan(data)
    } catch {
      setError('No se pudo generar el plan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const today = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, c => c.toUpperCase())

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="displayLarge" color="primary">Plan</Text>
          <Text variant="body" color="secondary">{today}</Text>
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

            <View style={styles.section}>
              <Text variant="micro" color="secondary" style={styles.sectionLabel}>AGENDA DE HOY</Text>
              <Card padding="none">
                {plan.items.map((item, i) => (
                  <View key={`${item.kind}-${item.id}`}>
                    <PlanItem item={item} />
                    {i < plan.items.length - 1 && (
                      <View style={styles.divider} />
                    )}
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
    paddingTop: Spacing.xl + 8,
    paddingBottom: Spacing.lg,
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
