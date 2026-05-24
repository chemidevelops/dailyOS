import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Card, PressableCard, HStack, VStack, Divider } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { MOCK_PLAN } from '@/constants/mockData'

type FilterType = 'all' | 'habit' | 'task' | 'leisure'
type SortMode   = 'time' | 'type' | 'duration'

const TYPE_COLORS: Record<string, string> = {
  habit:   Colors.mint,
  task:    Colors.indigo,
  leisure: Colors.coral,
  anime:   Colors.indigo,
}

const TYPE_LABELS: Record<string, string> = {
  habit: 'HÁBITO', task: 'TAREA', leisure: 'OCIO', anime: 'ANIME',
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',     label: 'TODO' },
  { key: 'habit',   label: 'HÁBITOS' },
  { key: 'task',    label: 'TAREAS' },
  { key: 'leisure', label: 'OCIO' },
]

// Extend mock with more backlog items
const BACKLOG_EXTRA = [
  { id: 'b1', itemType: 'task' as const,    title: 'Preparar presentación',  color: Colors.indigo, durationMinutes: 45, isDone: false, subtitle: 'Para el jueves' },
  { id: 'b2', itemType: 'task' as const,    title: 'Responder emails',        color: Colors.indigo, durationMinutes: 20, isDone: false, subtitle: undefined },
  { id: 'b3', itemType: 'leisure' as const, title: 'Hollow Knight',           color: Colors.purple, durationMinutes: 60, isDone: false, subtitle: 'Pendiente de empezar' },
]

function CapacityBar({ planned, total }: { planned: number; total: number }) {
  const pct = Math.min((planned / total) * 100, 100)
  const over = planned > total
  return (
    <Card variant="default" padding="md" style={{ marginBottom: Spacing.lg }}>
      <HStack style={{ justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        <Text variant="captionMedium" color="primary">Capacidad del día</Text>
        <Text variant="captionMedium" customColor={over ? Colors.coral : Colors.mint}>
          {Math.floor(planned / 60)}h {planned % 60}m / {Math.floor(total / 60)}h {total % 60}m
        </Text>
      </HStack>
      <View style={styles.trackOuter}>
        <View style={[
          styles.trackFill,
          { width: `${pct}%`, backgroundColor: over ? Colors.coral : Colors.mint },
        ]} />
      </View>
      <Text variant="micro" color="tertiary" style={{ marginTop: Spacing.xs }}>
        {over
          ? `${planned - total} min sobre el límite`
          : `${total - planned} min disponibles`}
      </Text>
    </Card>
  )
}

function PlanItem({
  item, index, onToggle,
}: {
  item: typeof MOCK_PLAN.plannedItems[0]
  index: number
  onToggle: (id: string) => void
}) {
  const color = TYPE_COLORS[item.itemType] ?? Colors.textTertiary
  const label = TYPE_LABELS[item.itemType] ?? item.itemType.toUpperCase()

  return (
    <PressableCard
      variant="default"
      padding="md"
      style={[styles.planItem, item.isDone && { opacity: 0.4 }]}
      onPress={() => {}}
    >
      <HStack gap="md" style={{ alignItems: 'flex-start' }}>
        {/* Drag handle / index */}
        <View style={styles.indexBox}>
          <Text variant="micro" color="tertiary">{String(index + 1).padStart(2, '0')}</Text>
        </View>

        <VStack gap="xs" style={{ flex: 1 }}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={[styles.typeBadge, { backgroundColor: color + '20', borderColor: color + '60' }]}>
              <Text variant="micro" customColor={color}>{label}</Text>
            </View>
            {item.suggestedStart && (
              <Text variant="micro" color="tertiary">{item.suggestedStart}</Text>
            )}
          </HStack>

          <Text
            variant="bodyMedium"
            customColor={item.isDone ? Colors.textTertiary : Colors.textPrimary}
            style={item.isDone ? { textDecorationLine: 'line-through' } : undefined}
          >
            {item.title}
          </Text>
          {item.subtitle && (
            <Text variant="caption" color="tertiary">{item.subtitle}</Text>
          )}
        </VStack>

        <HStack gap="sm" style={{ alignItems: 'center' }}>
          <Text variant="micro" color="tertiary">{item.durationMinutes}m</Text>
          <Pressable onPress={() => onToggle(item.id)} hitSlop={8}>
            <View style={[
              styles.check,
              item.isDone && { backgroundColor: Colors.mint, borderColor: Colors.mint },
            ]}>
              {item.isDone && <Text variant="micro" color="inverse">✓</Text>}
            </View>
          </Pressable>
        </HStack>
      </HStack>
    </PressableCard>
  )
}

export default function PlanScreen() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [items, setItems]   = useState([...MOCK_PLAN.plannedItems, ...BACKLOG_EXTRA])

  const toggleItem = (id: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, isDone: !i.isDone } : i))

  const visible = filter === 'all'
    ? items
    : items.filter(i => i.itemType === filter)

  const planned = items.filter(i => !i.isDone).reduce((s, i) => s + i.durationMinutes, 0)
  const total   = MOCK_PLAN.totalFreeMinutes

  const todayItems    = visible.filter(i => MOCK_PLAN.plannedItems.find(p => p.id === i.id))
  const backlogItems  = visible.filter(i => !MOCK_PLAN.plannedItems.find(p => p.id === i.id))
  const deferredItems = MOCK_PLAN.deferredItems

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="displayLarge" color="primary">Plan</Text>
          <Text variant="body" color="secondary">Organiza tu día</Text>
        </View>

        <View style={styles.section}>
          <CapacityBar planned={planned} total={total} />
        </View>

        {/* Filters */}
        <View style={styles.section}>
          <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, filter === f.key && { backgroundColor: Colors.textPrimary }]}
              >
                <Text variant="micro" customColor={filter === f.key ? Colors.textInverse : Colors.textSecondary}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </View>

        {/* Plan de hoy */}
        {todayItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>HOY · {todayItems.length} ITEMS</Text>
            <VStack gap="sm">
              {todayItems.map((item, i) => (
                <PlanItem key={item.id} item={item} index={i} onToggle={toggleItem} />
              ))}
            </VStack>
          </View>
        )}

        {/* Backlog */}
        {backlogItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>BACKLOG · {backlogItems.length} ITEMS</Text>
            <VStack gap="sm">
              {backlogItems.map((item, i) => (
                <PlanItem key={item.id} item={item} index={i} onToggle={toggleItem} />
              ))}
            </VStack>
          </View>
        )}

        {/* Diferidos */}
        {filter === 'all' && deferredItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>DIFERIDOS</Text>
            <Card variant="flat" padding="md">
              {deferredItems.map((item, i) => (
                <HStack key={item.id} gap="md" style={{ alignItems: 'center' }}>
                  <View style={[styles.typeBadge, { backgroundColor: Colors.surface2 }]}>
                    <Text variant="micro" color="tertiary">{(TYPE_LABELS[item.itemType] ?? item.itemType).toUpperCase()}</Text>
                  </View>
                  <Text variant="bodyMedium" color="secondary" style={{ flex: 1 }}>{item.title}</Text>
                  <Text variant="micro" color="tertiary">{item.durationMinutes}m</Text>
                </HStack>
              ))}
            </Card>
          </View>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },

  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  trackOuter: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  trackFill: { height: '100%' },

  planItem: {},
  indexBox: {
    width: 28, height: 28,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typeBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
})
