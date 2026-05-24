import { useState, useCallback } from 'react'
import {
  View, ScrollView, StyleSheet, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Text, Card, HStack, VStack, Button, Divider } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { api, ApiActivity, ApiItem } from '@/constants/api'

const STATUS_LABEL: Record<string, string> = {
  active:  'EN CURSO',
  pending: 'PENDIENTE',
  done:    'HECHO',
  dropped: 'DESCARTADO',
}
const STATUS_COLOR: Record<string, string> = {
  active:  Colors.mint,
  pending: Colors.indigo,
  done:    Colors.textTertiary,
  dropped: Colors.textTertiary,
}

// ─── Add item modal ───────────────────────────────────────────────────────────

function AddItemModal({
  visible, activityId, onClose, onSaved,
}: {
  visible: boolean
  activityId: number
  onClose: () => void
  onSaved: (item: ApiItem) => void
}) {
  const [title,  setTitle]  = useState('')
  const [status, setStatus] = useState<'active' | 'pending'>('pending')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const saved = await api.items.create(activityId, {
        activity_id: activityId,
        title: title.trim(),
        status,
      })
      onSaved(saved)
      setTitle('')
      setStatus('pending')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>

          <HStack style={styles.modalHeader}>
            <Pressable onPress={onClose}>
              <Text variant="captionMedium" color="secondary">Cancelar</Text>
            </Pressable>
            <Text variant="captionMedium" color="primary">Nuevo item</Text>
            <Pressable onPress={handleSave} disabled={!title.trim() || saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Text variant="captionMedium" customColor={title.trim() ? Colors.textPrimary : Colors.textTertiary} style={{ fontWeight: FontWeight.bold }}>
                    Guardar
                  </Text>
              }
            </Pressable>
          </HStack>

          <View style={styles.modalContent}>
            <Text variant="micro" color="secondary" style={styles.label}>TÍTULO</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Final Fantasy X, Andar 5km..."
                placeholderTextColor={Colors.textTertiary}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.lg }]}>ESTADO INICIAL</Text>
            <HStack gap="sm">
              {(['active', 'pending'] as const).map(s => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[
                    styles.chip,
                    status === s && { backgroundColor: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] },
                  ]}
                >
                  <Text variant="captionMedium" customColor={status === s ? '#fff' : Colors.textSecondary}>
                    {s === 'active' ? 'En curso' : 'Pendiente'}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, color, onStatusChange }: {
  item: ApiItem
  color: string
  onStatusChange: (id: number, status: string) => void
}) {
  const isDone    = item.status === 'done'
  const isActive  = item.status === 'active'
  const isDropped = item.status === 'dropped'

  const nextStatus = (): string => {
    if (item.status === 'pending') return 'active'
    if (item.status === 'active')  return 'done'
    if (item.status === 'done')    return 'pending'
    return 'pending'
  }

  return (
    <HStack style={styles.itemRow} gap="md">
      <Pressable onPress={() => onStatusChange(item.id, nextStatus())} hitSlop={10}>
        <View style={[
          styles.itemCheck,
          isActive  && { backgroundColor: color, borderColor: color },
          isDone    && { backgroundColor: Colors.surface2, borderColor: Colors.borderLight },
          isDropped && { backgroundColor: Colors.surface2, borderColor: Colors.borderLight },
        ]}>
          {(isDone || isDropped) && <Text variant="micro" color="tertiary">✓</Text>}
          {isActive && <Text variant="micro" color="inverse">▶</Text>}
        </View>
      </Pressable>

      <VStack gap="xs" style={{ flex: 1 }}>
        <Text
          variant="bodyMedium"
          customColor={isDone || isDropped ? Colors.textTertiary : Colors.textPrimary}
          style={isDone ? { textDecorationLine: 'line-through' } : undefined}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.progress > 0 && (
          <Text variant="micro" color="tertiary">
            {item.progress_label ?? `${item.progress}%`}
          </Text>
        )}
      </VStack>

      <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[item.status] + '60' }]}>
        <Text variant="micro" customColor={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Text>
      </View>
    </HStack>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActivityDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const [activity, setActivity] = useState<ApiActivity | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await api.activities.list()
      const found = list.find(a => a.id === Number(id))
      if (found) setActivity(found)
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleStatusChange = async (itemId: number, newStatus: string) => {
    setActivity(prev => {
      if (!prev) return prev
      return { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, status: newStatus as any } : i) }
    })
    try {
      await api.items.update(itemId, { status: newStatus })
    } catch {
      load()
    }
  }

  const handleItemSaved = (item: ApiItem) => {
    setActivity(prev => prev ? { ...prev, items: [...prev.items, item] } : prev)
    setShowAdd(false)
  }

  const handleDelete = async (itemId: number) => {
    setActivity(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev)
    try {
      await api.items.delete(itemId)
    } catch {
      load()
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.textPrimary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!activity) return null

  const activeItems  = activity.items.filter(i => i.status === 'active')
  const pendingItems = activity.items.filter(i => i.status === 'pending')
  const doneItems    = activity.items.filter(i => i.status === 'done' || i.status === 'dropped')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text variant="captionMedium" color="secondary">← Volver</Text>
          </Pressable>
          <HStack gap="sm" style={{ alignItems: 'center', marginTop: Spacing.md }}>
            <View style={[styles.colorDot, { backgroundColor: activity.color }]} />
            <Text variant="displayLarge" color="primary">{activity.title}</Text>
          </HStack>
          <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
            {activity.target_per_week === 7 ? 'Cada día' : `${activity.target_per_week}x por semana`} · {activity.duration_minutes}min
          </Text>
        </View>

        {/* Active items */}
        {activeItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>EN CURSO</Text>
            <Card padding="none" variant="elevated">
              {activeItems.map((item, i) => (
                <View key={item.id}>
                  <ItemRow item={item} color={activity.color} onStatusChange={handleStatusChange} />
                  {i < activeItems.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>PENDIENTE</Text>
            <Card padding="none">
              {pendingItems.map((item, i) => (
                <View key={item.id}>
                  <ItemRow item={item} color={activity.color} onStatusChange={handleStatusChange} />
                  {i < pendingItems.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Add button */}
        <View style={styles.section}>
          <Button
            label="+ Añadir item"
            variant="ghost"
            size="md"
            onPress={() => setShowAdd(true)}
            style={{ width: '100%' }}
          />
        </View>

        {/* Done/dropped */}
        {doneItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>COMPLETADOS</Text>
            <Card padding="none" variant="flat">
              {doneItems.map((item, i) => (
                <View key={item.id}>
                  <ItemRow item={item} color={activity.color} onStatusChange={handleStatusChange} />
                  {i < doneItems.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                </View>
              ))}
            </Card>
          </View>
        )}

        {activity.items.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text variant="displayMedium" color="primary" style={{ marginBottom: Spacing.sm }}>Sin items</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Añade los elementos concretos que quieres trabajar dentro de esta actividad.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AddItemModal
        visible={showAdd}
        activityId={activity.id}
        onClose={() => setShowAdd(false)}
        onSaved={handleItemSaved}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  content: { flexGrow: 1 },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  colorDot: {
    width: 14, height: 14, borderRadius: 3, marginTop: 6,
  },

  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },

  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },

  itemRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  itemCheck: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },

  // Modal
  modalSafe:    { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
  },
  modalContent: {
    padding: Spacing.xl,
  },
  label: { marginBottom: Spacing.sm },
  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.brutalSm,
  },
  input: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    outline: 'none',
  } as any,
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
})
