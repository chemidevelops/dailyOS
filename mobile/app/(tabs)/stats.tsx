import { useCallback } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useState } from 'react'
import { Text, Card, HStack, VStack } from '@/components/ui'
import { Spacing, Radius, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { api, ApiActivity } from '@/constants/api'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getISOWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + mondayOffset + i)
    dates.push(localDate(d))
  }
  return dates
}

const TODAY_ISO = localDate(new Date())
const WEEK_DATES = getISOWeekDates()
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type DayStatus = 'done' | 'pending' | 'skipped' | 'future'

function getDayStatus(activity: ApiActivity, date: string): DayStatus {
  if (date > TODAY_ISO) return 'future'
  const log = activity.logs.find(l => l.date === date)
  if (!log) return 'pending'
  return log.status as DayStatus
}

function calcCurrentStreak(activity: ApiActivity): number {
  let streak = 0
  const cursor = new Date()
  const todayLog = activity.logs.find(l => l.date === TODAY_ISO)
  if (todayLog?.status !== 'done') {
    cursor.setDate(cursor.getDate() - 1)
  }
  for (let i = 0; i < 365; i++) {
    const date = localDate(cursor)
    const log = activity.logs.find(l => l.date === date)
    if (log?.status === 'done') {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

function calcMaxStreak(activity: ApiActivity): number {
  const doneDates = activity.logs
    .filter(l => l.status === 'done')
    .map(l => l.date)
    .sort()
  if (doneDates.length === 0) return 0
  let max = 1, cur = 1
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1])
    const curr = new Date(doneDates[i])
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (diff === 1) { cur++; max = Math.max(max, cur) }
    else if (diff > 1) { cur = 1 }
  }
  return max
}

function getMonthStats(activity: ApiActivity): { done: number; elapsed: number } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const elapsed = now.getDate()
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const done = activity.logs.filter(
    l => l.date.startsWith(prefix) && l.status === 'done'
  ).length
  return { done, elapsed }
}

function WeekGrid({ activities }: { activities: ApiActivity[] }) {
  const C = useColors()
  const todayIdx = WEEK_DATES.indexOf(TODAY_ISO)

  return (
    <Card padding="none" style={{ marginBottom: Spacing.lg }}>
      <HStack style={[styles.gridRow, styles.gridHeader, { borderBottomColor: C.borderLight }]}>
        <View style={styles.activityLabel} />
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={[styles.gridCell, i === todayIdx && { borderRadius: Radius.sm, backgroundColor: C.surface2 }]}>
            <Text variant="micro" color={i === todayIdx ? 'primary' : 'tertiary'}
              style={i === todayIdx ? { fontWeight: FontWeight.bold } : undefined}>
              {label}
            </Text>
          </View>
        ))}
      </HStack>

      {activities.map((activity, aIdx) => (
        <HStack key={activity.id} style={[styles.gridRow,
          aIdx < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}>
          <View style={styles.activityLabel}>
            <View style={[styles.colorDot, { backgroundColor: activity.color }]} />
            <Text variant="micro" color="secondary" numberOfLines={1} style={{ flex: 1 }}>{activity.title}</Text>
          </View>
          {WEEK_DATES.map((date, dIdx) => {
            const status = getDayStatus(activity, date)
            const isToday = dIdx === todayIdx
            const bg = status === 'done' ? activity.color : status === 'skipped' ? C.surface2 : 'transparent'
            return (
              <View key={dIdx} style={styles.gridCell}>
                <View style={[styles.cellDot, {
                  backgroundColor: bg,
                  borderColor: isToday ? C.border : status === 'done' ? activity.color : C.borderLight,
                  borderWidth: isToday ? 2 : 1.5,
                }]}>
                  {status === 'skipped' && (
                    <View style={[styles.dotSlash, { backgroundColor: C.textTertiary }]} />
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

function StreakRow({ activity }: { activity: ApiActivity }) {
  const C = useColors()
  const current = calcCurrentStreak(activity)
  const max = calcMaxStreak(activity)
  return (
    <HStack style={[styles.streakRow, { borderBottomColor: C.borderLight }]}>
      <HStack gap="sm" style={{ flex: 1, alignItems: 'center' }}>
        <View style={[styles.colorDot, { backgroundColor: activity.color }]} />
        <Text variant="bodyMedium" color="primary" numberOfLines={1} style={{ flex: 1 }}>{activity.title}</Text>
      </HStack>
      <HStack gap="lg" style={{ alignItems: 'center' }}>
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Text variant="displayMedium" color="primary">{current}</Text>
          <Text variant="micro" color="tertiary">ACTUAL</Text>
        </VStack>
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Text variant="displayMedium" color="secondary">{max}</Text>
          <Text variant="micro" color="tertiary">MÁX</Text>
        </VStack>
      </HStack>
    </HStack>
  )
}

function MonthRow({ activity }: { activity: ApiActivity }) {
  const C = useColors()
  const { done, elapsed } = getMonthStats(activity)
  const pct = elapsed > 0 ? Math.min((done / elapsed) * 100, 100) : 0
  return (
    <View style={[styles.monthRow, { borderBottomColor: C.borderLight }]}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
        <HStack gap="sm" style={{ alignItems: 'center', flex: 1 }}>
          <View style={[styles.colorDot, { backgroundColor: activity.color }]} />
          <Text variant="bodyMedium" color="primary" numberOfLines={1} style={{ flex: 1 }}>{activity.title}</Text>
        </HStack>
        <Text variant="micro" color="secondary">{done}/{elapsed} días</Text>
      </HStack>
      <View style={[styles.progressTrack, { backgroundColor: C.surface2, marginLeft: 18 }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: activity.color }]} />
      </View>
    </View>
  )
}

export default function StatsScreen() {
  const C = useColors()
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await api.activities.list()
      setActivities(data.filter(a => a.is_active))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const monthName = new Date().toLocaleDateString('es', { month: 'long' })
    .replace(/^./, c => c.toUpperCase())

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
            <View style={styles.section}>
              <Text variant="micro" color="secondary" style={styles.sectionLabel}>SEMANA ACTUAL</Text>
              <WeekGrid activities={activities} />
            </View>
            <View style={styles.section}>
              <Text variant="micro" color="secondary" style={styles.sectionLabel}>RACHAS</Text>
              <Card padding="none">
                {activities.map(a => <StreakRow key={a.id} activity={a} />)}
              </Card>
            </View>
            <View style={styles.section}>
              <Text variant="micro" color="secondary" style={styles.sectionLabel}>{monthName.toUpperCase()}</Text>
              <Card padding="none">
                {activities.map(a => <MonthRow key={a.id} activity={a} />)}
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
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },
  gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  gridHeader: { borderBottomWidth: 1 },
  activityLabel: { width: 110, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingRight: Spacing.xs },
  gridCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xs },
  cellDot: { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dotSlash: { width: '130%', height: 1.5, transform: [{ rotate: '45deg' }] },
  colorDot: { width: 8, height: 8, borderRadius: 2 },
  streakRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  monthRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
})
