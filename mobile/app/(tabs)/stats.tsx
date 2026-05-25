import { useCallback, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Text, Card, HStack, VStack } from '@/components/ui'
import { Spacing, Radius, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { api, ApiCategoryWeeklyStats, ApiDayEntryWithDetails } from '@/constants/api'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getISOWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + mondayOffset + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

const TODAY_ISO = new Date().toISOString().split('T')[0]
const WEEK_DATES = getISOWeekDates()
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// ─── Weekly goal bar ──────────────────────────────────────────────────────────

function GoalBar({ stats }: { stats: ApiCategoryWeeklyStats }) {
  const C = useColors()
  const pct = stats.goal_minutes > 0
    ? Math.min(100, Math.round((stats.done_minutes / stats.goal_minutes) * 100))
    : null

  return (
    <View style={[styles.goalRow, { borderBottomColor: C.borderLight }]}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
        <HStack gap="sm" style={{ alignItems: 'center', flex: 1 }}>
          <View style={[styles.colorDot, { backgroundColor: stats.category.color }]} />
          <Text variant="bodyMedium" color="primary" numberOfLines={1} style={{ flex: 1 }}>
            {stats.category.icon} {stats.category.title}
          </Text>
        </HStack>
        <Text variant="micro" color="secondary">
          {Math.round(stats.done_minutes / 60 * 10) / 10}h
          {stats.goal_minutes > 0 ? ` / ${Math.round(stats.goal_minutes / 60 * 10) / 10}h` : ''}
        </Text>
      </HStack>

      {pct !== null && (
        <View style={[styles.progressTrack, { backgroundColor: C.surface2, marginLeft: 18 }]}>
          <View style={[styles.progressFill, {
            width: `${pct}%` as any,
            backgroundColor: pct >= 100 ? C.mint : stats.category.color,
          }]} />
        </View>
      )}

      <HStack gap="lg" style={{ marginLeft: 18, marginTop: Spacing.xs }}>
        <Text variant="micro" color="tertiary">{stats.done_count} sesiones</Text>
        {stats.skipped_count > 0 && (
          <Text variant="micro" color="tertiary">{stats.skipped_count} saltadas</Text>
        )}
        {pct !== null && pct >= 100 && (
          <Text variant="micro" customColor={C.mint}>¡Meta alcanzada! ✓</Text>
        )}
      </HStack>
    </View>
  )
}

// ─── Week grid ────────────────────────────────────────────────────────────────

function WeekGrid({
  entries,
  stats,
}: {
  entries: ApiDayEntryWithDetails[]
  stats: ApiCategoryWeeklyStats[]
}) {
  const C = useColors()
  const todayIdx = WEEK_DATES.indexOf(TODAY_ISO)
  const categories = stats.map(s => s.category)

  return (
    <Card padding="none" style={{ marginBottom: Spacing.lg }}>
      {/* Header */}
      <HStack style={[styles.gridRow, styles.gridHeader, { borderBottomColor: C.borderLight }]}>
        <View style={styles.catLabel} />
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={[styles.gridCell, i === todayIdx && { borderRadius: Radius.sm, backgroundColor: C.surface2 }]}>
            <Text variant="micro" color={i === todayIdx ? 'primary' : 'tertiary'}
              style={i === todayIdx ? { fontWeight: FontWeight.bold } : undefined}>
              {label}
            </Text>
          </View>
        ))}
      </HStack>

      {categories.map((cat, aIdx) => (
        <HStack key={cat.id} style={[styles.gridRow, aIdx < categories.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
          <View style={styles.catLabel}>
            <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
            <Text variant="micro" color="secondary" numberOfLines={1} style={{ flex: 1 }}>{cat.title}</Text>
          </View>

          {WEEK_DATES.map((date, dIdx) => {
            const dayEntries = entries.filter(e => e.category_id === cat.id && e.date === date)
            const hasDone    = dayEntries.some(e => e.status === 'done')
            const hasSkipped = dayEntries.some(e => e.status === 'skipped')
            const hasPending = dayEntries.some(e => e.status === 'pending')
            const isFuture   = date > TODAY_ISO
            const isToday    = dIdx === todayIdx

            const bg = hasDone ? cat.color : hasSkipped ? C.surface2 : 'transparent'

            return (
              <View key={dIdx} style={styles.gridCell}>
                <View style={[styles.cellDot, {
                  backgroundColor: bg,
                  borderColor: isToday ? C.border : hasDone ? cat.color : C.borderLight,
                  borderWidth: isToday ? 2 : 1.5,
                  opacity: isFuture ? 0.3 : 1,
                }]}>
                  {hasSkipped && !hasDone && (
                    <View style={[styles.dotSlash, { backgroundColor: C.textTertiary }]} />
                  )}
                  {hasPending && !hasDone && !hasSkipped && !isFuture && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: cat.color }} />
                  )}
                </View>
              </View>
            )
          })}
        </HStack>
      ))}
    </Card>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const C = useColors()
  const [stats, setStats] = useState<ApiCategoryWeeklyStats[]>([])
  const [entries, setEntries] = useState<ApiDayEntryWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const weekStart = WEEK_DATES[0]
      const weekEnd   = WEEK_DATES[6]
      const [weekStats, todayEntries] = await Promise.all([
        api.stats.weekly(),
        // Fetch all week entries by fetching each day (simpler: just fetch today's range via backlog logic)
        // Actually we need entries per day — let's fetch from schedule using date range
        // The API only supports per-day for now, so load each day
        Promise.all(WEEK_DATES.map(d => api.schedule.list(d))).then(days => days.flat()),
      ])
      setStats(weekStats)
      setEntries(todayEntries)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="displayLarge" color="primary">Estadísticas</Text>
          <Text variant="body" color="secondary">
            {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
              .replace(/^./, c => c.toUpperCase())}
          </Text>
        </View>

        {loading ? null : (
          <>
            {stats.length > 0 && (
              <>
                <View style={styles.section}>
                  <Text variant="micro" color="secondary" style={styles.sectionLabel}>SEMANA ACTUAL</Text>
                  <WeekGrid entries={entries} stats={stats} />
                </View>

                <View style={styles.section}>
                  <Text variant="micro" color="secondary" style={styles.sectionLabel}>METAS SEMANALES</Text>
                  <Card padding="none">
                    {stats.map(s => <GoalBar key={s.category.id} stats={s} />)}
                  </Card>
                </View>
              </>
            )}
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },

  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  gridHeader: { borderBottomWidth: 1 },
  catLabel: {
    width: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingRight: Spacing.xs,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  cellDot: {
    width: 18, height: 18, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  dotSlash: {
    width: '130%', height: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  colorDot: { width: 8, height: 8, borderRadius: 2 },

  goalRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  progressTrack: {
    height: 4, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
  },
})
