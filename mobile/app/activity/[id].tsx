import { useState, useCallback } from 'react'
import {
  View, ScrollView, StyleSheet, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Text, Card, HStack, VStack, Button, Divider } from '@/components/ui'
import { Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { api, ApiActivity, ApiItem } from '@/constants/api'

const COLORS = [
  '#3D5AFE', '#00C896', '#FF4D30', '#FFD600',
  '#8B2FC9', '#FF7700', '#00BCD4', '#E91E8C',
  '#43A047', '#F4511E', '#1E88E5', '#6D4C41',
  '#546E7A', '#FFB300', '#00897B', '#D81B60',
]
const DURATIONS = ['10', '15', '20', '30', '45', '60', '90', '120', '180']
const TARGETS   = ['1', '2', '3', '4', '5', '6', '7']

const STATUS_LABEL: Record<string, string> = {
  active: 'EN CURSO', pending: 'PENDIENTE', done: 'HECHO', dropped: 'DESCARTADO',
}

// ─── Edit activity modal ───────────────────────────────────────────────────────

function EditActivityModal({ activity, onClose, onSaved, onDeleted }: {
  activity: ApiActivity
  onClose: () => void
  onSaved: (a: ApiActivity) => void
  onDeleted: () => void
}) {
  const C = useColors()
  const [title,    setTitle]    = useState(activity.title)
  const [color,    setColor]    = useState(activity.color)
  const [duration, setDuration] = useState(String(activity.duration_minutes))
  const [target,   setTarget]   = useState(String(activity.target_per_week))
  const [saving,   setSaving]   = useState(false)

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const updated = await api.activities.update(activity.id, {
        title: title.trim(),
        color,
        duration_minutes: Number(duration),
        target_per_week: Number(target),
      })
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Borrar actividad',
      `¿Seguro que quieres borrar "${activity.title}"? Se eliminarán también todos sus items y registros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar', style: 'destructive',
          onPress: async () => {
            try {
              await api.activities.delete(activity.id)
              onDeleted()
            } catch {}
          },
        },
      ]
    )
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>

          <HStack style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Pressable onPress={onClose}>
              <Text variant="captionMedium" color="secondary">Cancelar</Text>
            </Pressable>
            <Text variant="captionMedium" color="primary">Editar actividad</Text>
            <Pressable onPress={handleSave} disabled={!title.trim() || saving}>
              {saving
                ? <ActivityIndicator size="small" color={C.textPrimary} />
                : <Text variant="captionMedium" customColor={title.trim() ? C.textPrimary : C.textTertiary} style={{ fontWeight: FontWeight.bold }}>Guardar</Text>
              }
            </Pressable>
          </HStack>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

            <Text variant="micro" color="secondary" style={styles.label}>NOMBRE</Text>
            <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={C.textTertiary}
                autoFocus
              />
            </View>

            <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.lg }]}>COLOR</Text>
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <Pressable key={c} onPress={() => setColor(c)}
                  style={[styles.colorDotBtn, { backgroundColor: c },
                    color === c && { borderWidth: 3, borderColor: C.textPrimary }]}>
                  {color === c && <Text variant="micro" customColor="#fff">✓</Text>}
                </Pressable>
              ))}
            </HStack>

            <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.lg }]}>DURACIÓN</Text>
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              {DURATIONS.map(d => (
                <Pressable key={d} onPress={() => setDuration(d)}
                  style={[styles.chip, { borderColor: C.border, backgroundColor: C.surface },
                    duration === d && { backgroundColor: C.textPrimary, borderColor: C.textPrimary }]}>
                  <Text variant="captionMedium" customColor={duration === d ? C.textInverse : C.textSecondary}>
                    {Number(d) >= 60 ? `${Number(d)/60}h` : `${d}m`}
                  </Text>
                </Pressable>
              ))}
            </HStack>

            <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.lg }]}>DÍAS POR SEMANA</Text>
            <HStack gap="sm" style={{ flexWrap: 'wrap' }}>
              {TARGETS.map(t => (
                <Pressable key={t} onPress={() => setTarget(t)}
                  style={[styles.chip, { borderColor: C.border, backgroundColor: C.surface },
                    target === t && { backgroundColor: C.textPrimary, borderColor: C.textPrimary }]}>
                  <Text variant="captionMedium" customColor={target === t ? C.textInverse : C.textSecondary}>
                    {t === '7' ? 'Cada día' : `${t}x`}
                  </Text>
                </Pressable>
              ))}
            </HStack>

            <Pressable onPress={handleDelete} style={[styles.deleteBtn, { borderColor: C.coral }]}>
              <Text variant="captionMedium" customColor={C.coral}>Borrar actividad</Text>
            </Pressable>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Add item modal ────────────────────────────────────────────────────────────

function AddItemModal({ visible, activityId, onClose, onSaved }: {
  visible: boolean
  activityId: number
  onClose: () => void
  onSaved: (item: ApiItem) => void
}) {
  const C = useColors()
  const [title,  setTitle]  = useState('')
  const [status, setStatus] = useState<'active' | 'pending'>('pending')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const saved = await api.items.create(activityId, { activity_id: activityId, title: title.trim(), status })
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
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>

          <HStack style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Pressable onPress={onClose}>
              <Text variant="captionMedium" color="secondary">Cancelar</Text>
            </Pressable>
            <Text variant="captionMedium" color="primary">Nuevo item</Text>
            <Pressable onPress={handleSave} disabled={!title.trim() || saving}>
              {saving
                ? <ActivityIndicator size="small" color={C.textPrimary} />
                : <Text variant="captionMedium" customColor={title.trim() ? C.textPrimary : C.textTertiary} style={{ fontWeight: FontWeight.bold }}>Guardar</Text>
              }
            </Pressable>
          </HStack>

          <View style={styles.modalContent}>
            <Text variant="micro" color="secondary" style={styles.label}>TÍTULO</Text>
            <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Final Fantasy X, Andar 5km..."
                placeholderTextColor={C.textTertiary}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <Text variant="micro" color="secondary" style={[styles.label, { marginTop: Spacing.lg }]}>ESTADO INICIAL</Text>
            <HStack gap="sm">
              {(['active', 'pending'] as const).map(s => (
                <Pressable key={s} onPress={() => setStatus(s)}
                  style={[styles.chip, { borderColor: C.border, backgroundColor: C.surface },
                    status === s && { backgroundColor: s === 'active' ? C.mint : C.indigo, borderColor: s === 'active' ? C.mint : C.indigo }]}>
                  <Text variant="captionMedium" customColor={status === s ? '#fff' : C.textSecondary}>
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

// ─── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, color, onStatusChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  item: ApiItem
  color: string
  onStatusChange: (id: number, status: string) => void
  onDelete: (id: number) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) {
  const C = useColors()
  const isDone    = item.status === 'done'
  const isActive  = item.status === 'active'
  const isDropped = item.status === 'dropped'

  const statusColor: Record<string, string> = {
    active: C.mint, pending: C.indigo, done: C.textTertiary, dropped: C.textTertiary,
  }

  const nextStatus = () => {
    if (item.status === 'pending') return 'active'
    if (item.status === 'active')  return 'done'
    return 'pending'
  }

  const confirmDelete = () => {
    Alert.alert('Borrar item', `¿Borrar "${item.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => onDelete(item.id) },
    ])
  }

  return (
    <HStack style={styles.itemRow} gap="md">
      <Pressable onPress={() => onStatusChange(item.id, nextStatus())} hitSlop={10}>
        <View style={[styles.itemCheck, { borderColor: C.border, backgroundColor: C.surface },
          isActive  && { backgroundColor: color, borderColor: color },
          (isDone || isDropped) && { backgroundColor: C.surface2, borderColor: C.borderLight }]}>
          {(isDone || isDropped) && <Text variant="micro" color="tertiary">✓</Text>}
          {isActive && <Text variant="micro" color="inverse">▶</Text>}
        </View>
      </Pressable>

      <VStack gap="xs" style={{ flex: 1 }}>
        <Text variant="bodyMedium"
          customColor={isDone || isDropped ? C.textTertiary : C.textPrimary}
          style={isDone ? { textDecorationLine: 'line-through' } : undefined}
          numberOfLines={2}>
          {item.title}
        </Text>
      </VStack>

      <View style={[styles.statusBadge, { borderColor: statusColor[item.status] + '60' }]}>
        <Text variant="micro" customColor={statusColor[item.status]}>{STATUS_LABEL[item.status]}</Text>
      </View>

      {(onMoveUp || onMoveDown) && (
        <VStack gap="xs" style={{ alignItems: 'center' }}>
          <Pressable onPress={onMoveUp} hitSlop={8} disabled={!canMoveUp} style={{ opacity: canMoveUp ? 1 : 0.2 }}>
            <Text variant="micro" color="tertiary">▲</Text>
          </Pressable>
          <Pressable onPress={onMoveDown} hitSlop={8} disabled={!canMoveDown} style={{ opacity: canMoveDown ? 1 : 0.2 }}>
            <Text variant="micro" color="tertiary">▼</Text>
          </Pressable>
        </VStack>
      )}

      <Pressable onPress={confirmDelete} hitSlop={12} style={{ paddingLeft: Spacing.xs }}>
        <Text variant="body" customColor={C.textTertiary}>×</Text>
      </Pressable>
    </HStack>
  )
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ActivityDetailScreen() {
  const C = useColors()
  const { id }    = useLocalSearchParams<{ id: string }>()
  const router    = useRouter()
  const insets    = useSafeAreaInsets()
  const [activity,  setActivity]  = useState<ApiActivity | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showEdit,  setShowEdit]  = useState(false)

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
    setActivity(prev => prev ? { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, status: newStatus as any } : i) } : prev)
    try { await api.items.update(itemId, { status: newStatus }) } catch { load() }
  }

  const handleItemSaved = (item: ApiItem) => {
    setActivity(prev => prev ? { ...prev, items: [...prev.items, item] } : prev)
    setShowAdd(false)
  }

  const handleItemDelete = async (itemId: number) => {
    setActivity(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev)
    try { await api.items.delete(itemId) } catch { load() }
  }

  const handleReorder = async (items: ApiItem[], fromIdx: number, direction: -1 | 1) => {
    if (!activity) return
    const toIdx = fromIdx + direction
    if (toIdx < 0 || toIdx >= items.length) return
    const newItems = [...items]
    ;[newItems[fromIdx], newItems[toIdx]] = [newItems[toIdx], newItems[fromIdx]]
    // Update in state: replace pending items with reordered ones
    setActivity(prev => {
      if (!prev) return prev
      const otherItems = prev.items.filter(i => i.status !== 'pending')
      return { ...prev, items: [...otherItems, ...newItems] }
    })
    const order = newItems.map(i => i.id)
    api.items.reorder(activity.id, order).catch(() => load())
  }

  const handleActivitySaved = (updated: ApiActivity) => {
    setActivity(updated)
    setShowEdit(false)
  }

  const handleActivityDeleted = () => {
    setShowEdit(false)
    router.back()
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.textPrimary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!activity) return null

  const activeItems  = activity.items.filter(i => i.status === 'active')
  const pendingItems = activity.items.filter(i => i.status === 'pending')
  const doneItems    = activity.items.filter(i => i.status === 'done' || i.status === 'dropped')

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Pressable onPress={() => router.back()}>
              <Text variant="captionMedium" color="secondary">← Volver</Text>
            </Pressable>
            <Pressable onPress={() => setShowEdit(true)}
              style={[styles.editBtn, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Text variant="micro" color="secondary">EDITAR</Text>
            </Pressable>
          </HStack>
          <HStack gap="sm" style={{ alignItems: 'center', marginTop: Spacing.md }}>
            <View style={[styles.colorDot, { backgroundColor: activity.color }]} />
            <Text variant="displayLarge" color="primary">{activity.title}</Text>
          </HStack>
          <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
            {activity.target_per_week === 7 ? 'Cada día' : `${activity.target_per_week}x por semana`} · {activity.duration_minutes}min
          </Text>
        </View>

        {activeItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>EN CURSO</Text>
            <Card padding="none" variant="elevated">
              {activeItems.map((item, i) => (
                <View key={item.id}>
                  <ItemRow item={item} color={activity.color} onStatusChange={handleStatusChange} onDelete={handleItemDelete} />
                  {i < activeItems.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                </View>
              ))}
            </Card>
          </View>
        )}

        {pendingItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>PENDIENTE</Text>
            <Card padding="none">
              {pendingItems.map((item, i) => (
                <View key={item.id}>
                  <ItemRow
                    item={item}
                    color={activity.color}
                    onStatusChange={handleStatusChange}
                    onDelete={handleItemDelete}
                    onMoveUp={() => handleReorder(pendingItems, i, -1)}
                    onMoveDown={() => handleReorder(pendingItems, i, 1)}
                    canMoveUp={i > 0}
                    canMoveDown={i < pendingItems.length - 1}
                  />
                  {i < pendingItems.length - 1 && <Divider style={{ marginHorizontal: Spacing.lg }} />}
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Button label="+ Añadir al backlog" variant="ghost" size="md" onPress={() => setShowAdd(true)} style={{ width: '100%' }} />
        </View>

        {doneItems.length > 0 && (
          <View style={styles.section}>
            <Text variant="micro" color="secondary" style={styles.sectionLabel}>COMPLETADOS</Text>
            <Card padding="none" variant="flat">
              {doneItems.map((item, i) => (
                <View key={item.id}>
                  <ItemRow item={item} color={activity.color} onStatusChange={handleStatusChange} onDelete={handleItemDelete} />
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

      <AddItemModal visible={showAdd} activityId={activity.id} onClose={() => setShowAdd(false)} onSaved={handleItemSaved} />
      {showEdit && (
        <EditActivityModal activity={activity} onClose={() => setShowEdit(false)} onSaved={handleActivitySaved} onDeleted={handleActivityDeleted} />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { flexGrow: 1 },

  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  colorDot: { width: 14, height: 14, borderRadius: 3, marginTop: 6 },

  section:      { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.sm },

  emptyWrap: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },

  itemRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  itemCheck: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs + 2, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1.5,
  },

  modalSafe:    { flex: 1 },
  modalHeader:  {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5,
  },
  modalContent: { padding: Spacing.xl },
  label:        { marginBottom: Spacing.sm },
  inputWrap:    { borderRadius: Radius.md, borderWidth: 1.5, ...Shadow.brutalSm },
  input: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: 16, outline: 'none',
  } as any,
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  colorDotBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    marginTop: Spacing.xxl,
    borderWidth: 1.5, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
})
