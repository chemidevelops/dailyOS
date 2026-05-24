import { useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Text, Card, PressableCard, HStack, VStack } from '@/components/ui'
import { Colors, Spacing, Radius } from '@/constants/tokens'
import { api, ApiLeisure } from '@/constants/api'

type MediaType   = 'game' | 'anime' | 'book' | 'series'
type MediaStatus = 'playing' | 'pending' | 'done' | 'dropped'

const TYPE_LABELS: Record<MediaType, string> = {
  game: 'JUEGO', anime: 'ANIME', book: 'LIBRO', series: 'SERIE',
}
const STATUS_LABELS: Record<MediaStatus, string> = {
  playing: 'EN CURSO', pending: 'PENDIENTE', done: 'TERMINADO', dropped: 'DEJADO',
}
const FILTERS: { key: MediaType | 'all'; label: string }[] = [
  { key: 'all',    label: 'TODO' },
  { key: 'game',   label: 'JUEGOS' },
  { key: 'anime',  label: 'ANIME' },
  { key: 'book',   label: 'LIBROS' },
  { key: 'series', label: 'SERIES' },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <HStack gap="xs">
      {[1,2,3,4,5].map(i => (
        <View key={i} style={[styles.star, { backgroundColor: i <= rating ? Colors.yellow : Colors.surface2 }]} />
      ))}
    </HStack>
  )
}

function MediaCard({ item }: { item: ApiLeisure }) {
  const isActive = item.status === 'playing'

  return (
    <PressableCard
      variant={isActive ? 'elevated' : 'default'}
      padding="md"
      style={[styles.mediaCard, !isActive && { opacity: 0.85 }]}
      onPress={() => {}}
    >
      <HStack gap="md" style={{ alignItems: 'flex-start' }}>
        <View style={[styles.cover, { backgroundColor: item.color }]}>
          <Text variant="micro" color="inverse" style={{ textAlign: 'center', lineHeight: 14 }}>
            {TYPE_LABELS[item.type]}
          </Text>
        </View>

        <VStack gap="xs" style={{ flex: 1 }}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text variant="bodyMedium" color="primary" numberOfLines={2} style={{ flex: 1, marginRight: Spacing.sm }}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, {
              backgroundColor: item.status === 'playing' ? item.color + '20' : Colors.surface2,
              borderColor: item.status === 'playing' ? item.color : Colors.borderLight,
            }]}>
              <Text variant="micro" customColor={item.status === 'playing' ? item.color : Colors.textTertiary}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
          </HStack>

          {item.subtitle && <Text variant="caption" color="tertiary">{item.subtitle}</Text>}

          {item.progress > 0 && (
            <View style={{ marginTop: Spacing.xs }}>
              <HStack style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <Text variant="micro" color="secondary">{item.progress_label}</Text>
                <Text variant="micro" color="tertiary">{item.progress}%</Text>
              </HStack>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          )}

          {item.rating != null && (
            <HStack gap="sm" style={{ alignItems: 'center', marginTop: Spacing.xs }}>
              <StarRating rating={item.rating} />
              {item.total_hours != null && (
                <Text variant="micro" color="tertiary">{item.total_hours}h</Text>
              )}
            </HStack>
          )}
        </VStack>
      </HStack>
    </PressableCard>
  )
}

function SummaryBar({ items }: { items: ApiLeisure[] }) {
  const playing = items.filter(i => i.status === 'playing').length
  const pending = items.filter(i => i.status === 'pending').length
  const done    = items.filter(i => i.status === 'done').length

  return (
    <Card variant="yellow" padding="md" style={{ marginBottom: Spacing.lg }}>
      <HStack style={{ justifyContent: 'space-around' }}>
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Text variant="displayMedium" color="primary">{playing}</Text>
          <Text variant="micro" color="secondary">EN CURSO</Text>
        </VStack>
        <View style={styles.divider} />
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Text variant="displayMedium" color="primary">{pending}</Text>
          <Text variant="micro" color="secondary">PENDIENTE</Text>
        </VStack>
        <View style={styles.divider} />
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Text variant="displayMedium" color="primary">{done}</Text>
          <Text variant="micro" color="secondary">TERMINADO</Text>
        </VStack>
      </HStack>
    </Card>
  )
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>Sin ocio</Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
        Pulsa el + para añadir juegos, anime, libros o series.
      </Text>
    </View>
  )
}

export default function LeisureScreen() {
  const [filter,  setFilter]  = useState<MediaType | 'all'>('all')
  const [media,   setMedia]   = useState<ApiLeisure[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await api.leisure.list()
      setMedia(data)
    } catch {
      setError('No se pudo conectar al servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const filtered = filter === 'all' ? media : media.filter(i => i.type === filter)
  const playing  = filtered.filter(i => i.status === 'playing')
  const pending  = filtered.filter(i => i.status === 'pending')
  const done     = filtered.filter(i => i.status === 'done')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="displayLarge" color="primary">Ocio</Text>
          <Text variant="body" color="secondary">Tu biblioteca personal</Text>
        </View>

        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>{error}</Text>
          </View>
        ) : media.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <View style={styles.section}>
              <SummaryBar items={media} />
            </View>

            <View style={styles.section}>
              <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
                {FILTERS.map(f => (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[
                      styles.filterChip,
                      filter === f.key && { backgroundColor: Colors.textPrimary },
                    ]}
                  >
                    <Text variant="micro" customColor={filter === f.key ? Colors.textInverse : Colors.textSecondary}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </View>

            {playing.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>EN CURSO</Text>
                <VStack gap="sm">
                  {playing.map(item => <MediaCard key={item.id} item={item} />)}
                </VStack>
              </View>
            )}

            {pending.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>PENDIENTE</Text>
                <VStack gap="sm">
                  {pending.map(item => <MediaCard key={item.id} item={item} />)}
                </VStack>
              </View>
            )}

            {done.length > 0 && (
              <View style={styles.section}>
                <Text variant="micro" color="secondary" style={styles.sectionLabel}>TERMINADO</Text>
                <VStack gap="sm">
                  {done.map(item => <MediaCard key={item.id} item={item} />)}
                </VStack>
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

  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  mediaCard: { marginBottom: 0 },

  cover: {
    width: 52, height: 68,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    flexShrink: 0,
  },

  progressTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  star: { width: 8, height: 8, borderRadius: 2 },

  divider: {
    width: 1.5, height: 36,
    backgroundColor: Colors.border,
    opacity: 0.2,
  },
})
