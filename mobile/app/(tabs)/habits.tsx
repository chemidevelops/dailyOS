import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Text, Card, HStack, VStack, Divider } from '@/components/ui'
import { Colors, Spacing, Radius, FontWeight } from '@/constants/tokens'
import { api, ApiHabit } from '@/constants/api'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const TODAY      = new Date().getDay()
const TODAY_ISO  = new Date().toISOString().split('T')[0]

// Get the ISO dates for the current week (Sun–Sat)
function getWeekDates(): string[] {
  const now  = new Date()
  const day  = now.getDay()
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - day + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

type DayStatus = 'done' | 'pending' | 'skipped' | 'future'

function habitWeekDays(habit: ApiHabit): DayStatus[] {
  const weekDates = getWeekDates()
  return weekDates.map((date, i) => {
    if (i > TODAY) return 'future'
    const log = habit.logs.find(l => l.date === date)
    return (log?.status ?? 'pending') as DayStatus
  })
}

function WeekDots({ days, color }: { days: DayStatus[]; color: string }) {
  return (
    <HStack gap="xs" style={{ alignItems: 'center' }}>
      {days.map((status, i) => {
        const isToday = i === TODAY
        const bg =
          status === 'done'   ? color :
          status === 'future' ? 'transparent' :
          status === 'skipped' ? Colors.surface2 : Colors.surface

        return (
          <View key={i} style={[
            styles.dot,
            { backgroundColor: bg, borderColor: isToday ? Colors.border : status === 'done' ? color : Colors.borderLight },
            isToday && styles.dotToday,
          ]}>
            {status === 'skipped' && (
              <View style={[styles.dotSlash, { backgroundColor: Colors.textTertiary }]} />
            )}
          </View>
        )
      })}
    </HStack>
  )
}

function HabitCard({ habit, onToggle }: { habit: ApiHabit; onToggle: (id: number) => void }) {
  const weekDays  = habitWeekDays(habit)
  const todayLog  = habit.logs.find(l => l.date === TODAY_ISO)
  const isDone    = todayLog?.status === 'done'
  const doneDays  = weekDays.filter(s => s === 'done').length
  const progress  = Math.round((doneDays / habit.target_per_week) * 100)

  return (
    <Pressable onPress={() => onToggle(habit.id)} style={styles.habitCard}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <VStack gap="xs" style={{ flex: 1, marginRight: Spacing.md }}>
          <HStack gap="sm" style={{ alignItems: 'center' }}>
            <View style={[styles.colorBlock, { backgroundColor: habit.color }]} />
            <Text variant="bodyMedium" color="primary" numberOfLines={1} style={{ flex: 1 }}>
              {habit.title}
            </Text>
          </HStack>
          <HStack gap="sm" style={{ alignItems: 'center', marginLeft: Spacing.sm + 10 }}>
            <Text variant="micro" color="tertiary">{doneDays}/{habit.target_per_week} esta semana</Text>
          </HStack>
        </VStack>

        <View style={[
          styles.checkBox,
          isDone && { backgroundColor: habit.color, borderColor: habit.color },
        ]}>
          {isDone && <Text variant="caption" color="inverse" style={{ fontWeight: FontWeight.bold }}>✓</Text>}
        </View>
      </HStack>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: habit.color }]} />
      </View>

      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm }}>
        <WeekDots days={weekDays} color={habit.color} />
        <Text variant="micro" color="tertiary">{habit.duration_minutes > 0 ? `${habit.duration_minutes}m` : '—'}</Text>
      </HStack>
    </Pressable>
  )
}

function StatsBar({ habits }: { habits: ApiHabit[] }) {
  const weekDays = habits.map(h => habitWeekDays(h))
  const todayDone  = weekDays.filter(d => d[TODAY] === 'done').length
  const totalDone  = weekDays.flat().filter(s => s === 'done').length
  const totalTarget = habits.reduce((s, h) => s + h.target_per_week, 0)

  return (
    <Card variant="yellow" padding="md" style={{ marginBottom: Spacing.lg }}>
      <HStack style={{ justifyContent: 'space-around' }}>
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Text variant="displayMedium" color="primary">{todayDone}/{habits.length}</Text>
          <Text variant="micro" color="secondary">HOY</Text>
        </VStack>
        <View style={styles.statDivider} />
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Text variant="displayMedium" color="primary">{totalDone}/{totalTarget}</Text>
          <Text variant="micro" color="secondary">SEMANA</Text>
        </VStack>
      </HStack>
    </Card>
  )
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>Sin hábitos</Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
        Pulsa el + en la pestaña de hoy para añadir tu primer hábito.
      </Text>
    </View>
  )
}

export default function HabitsScreen() {
  const [habits,  setHabits]  = useState<ApiHabit[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await api.habits.list()
      setHabits(data.filter(h => h.is_active))
    } catch {
      setError('No se pudo conectar al servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const toggleHabit = async (id: number) => {
    const habit    = habits.find(h => h.id === id)!
    const todayLog = habit.logs.find(l => l.date === TODAY_ISO)
    const newStatus: 'done' | 'pending' = todayLog?.status === 'done' ? 'pending' : 'done'

    // Optimistic update
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h
      const logs = h.logs.filter(l => l.date !== TODAY_ISO)
      if (newStatus === 'done') {
        logs.push({ id: -1, habit_id: id, date: TODAY_ISO, status: 'done' })
      }
      return { ...h, logs }
    }))

    try {
      const saved = await api.habits.log(id, TODAY_ISO, newStatus)
      setHabits(prev => prev.map(h => {
        if (h.id !== id) return h
        const logs = h.logs.filter(l => l.date !== TODAY_ISO)
        logs.push(saved)
        return { ...h, logs }
      }))
    } catch {
      load() // revert on error
    }
  }

  const pending = habits.filter(h => {
    const log = h.logs.find(l => l.date === TODAY_ISO)
    return log?.status !== 'done'
  })
  const done = habits.filter(h => {
    const log = h.logs.find(l => l.date === TODAY_ISO)
    return log?.status === 'done'
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="displayLarge" color="primary">Hábitos</Text>
          <Text variant="body" color="secondary">
            {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
              .replace(/^./, c => c.toUpperCase())}
          </Text>
        </View>

        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>{error}</Text>
          </View>
        ) : habits.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <View style={styles.section}>
              <StatsBar habits={habits} />
            </View>

            {pending.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>PENDIENTES</Text>
                <Card padding="none">
                  {pending.map((h, i) => (
                    <View key={h.id}>
                      <HabitCard habit={h} onToggle={toggleHabit} />
                      {i < pending.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {done.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>COMPLETADOS HOY</Text>
                <Card padding="none" variant="flat">
                  {done.map((h, i) => (
                    <View key={h.id}>
                      <HabitCard habit={h} onToggle={toggleHabit} />
                      {i < done.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                    </View>
                  ))}
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
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

  habitCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  colorBlock: {
    width: 10, height: 10, borderRadius: 2,
    marginTop: 2,
  },
  checkBox: {
    width: 32, height: 32, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },

  progressTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: Colors.surface2,
    marginTop: Spacing.md,
    marginLeft: Spacing.sm + 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
  },

  dot: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  dotToday: {
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dotSlash: {
    width: '130%', height: 1.5,
    transform: [{ rotate: '45deg' }],
  },

  statDivider: {
    width: 1.5, height: 36,
    backgroundColor: Colors.border,
    opacity: 0.2,
  },
})
