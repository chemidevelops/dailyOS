import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Pressable, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Text, Button, VStack, HStack } from '@/components/ui'
import { Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'
import { api } from '@/constants/api'

const TODAY_ISO = new Date().toISOString().split('T')[0]

type Phase = 'ready' | 'running' | 'paused' | 'done'

function pad(n: number) { return String(n).padStart(2, '0') }

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${pad(m)}:${pad(s)}`
}

function Ring({ progress, color, size = 240 }: { progress: number; color: string; size?: number }) {
  const C = useColors()
  const stroke = 6

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: C.surface2,
      }]} />
      {/* We simulate arc with a colored border overlay — simple approach for RN web */}
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: color,
        opacity: progress,
        transform: [{ rotate: `-90deg` }],
      }]} />
    </View>
  )
}

export default function FocusScreen() {
  const C = useColors()
  const router = useRouter()
  const params = useLocalSearchParams<{ title?: string; minutes?: string; color?: string; activityId?: string; itemId?: string }>()

  const title      = params.title      ?? 'Sesión de foco'
  const minutes    = parseInt(params.minutes ?? '25')
  const color      = params.color      ?? C.indigo
  const activityId = params.activityId ? parseInt(params.activityId) : null
  const itemId     = params.itemId     ? parseInt(params.itemId) : null
  const totalSec   = minutes * 60

  const [phase, setPhase]       = useState<Phase>('ready')
  const [remaining, setRemain]  = useState(totalSec)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const endTimeRef              = useRef<number | null>(null)
  const phaseRef                = useRef<Phase>('ready')
  const autoLoggedRef           = useRef(false)

  phaseRef.current = phase
  const progress = remaining / totalSec

  // Update document title while running
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (phase === 'running' || phase === 'paused') {
      document.title = `${title} · ${formatTime(remaining)}`
    } else if (phase === 'done') {
      document.title = 'DailyOS'
    }
    return () => {
      if (typeof document !== 'undefined') document.title = 'DailyOS'
    }
  }, [phase, remaining, title])

  const handleDone = async () => {
    if (autoLoggedRef.current) return
    autoLoggedRef.current = true
    if (activityId) {
      api.activities.log(activityId, TODAY_ISO, 'done', itemId ?? undefined).catch(() => {})
    }
    // Show "Completado" for 2 seconds then go back
    setTimeout(() => {
      router.back()
    }, 2000)
  }

  const tick = () => {
    if (endTimeRef.current === null) return
    const secs = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
    if (secs <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPhase('done')
      setRemain(0)
      // Web notification
      if (typeof document !== 'undefined' && 'Notification' in window) {
        const show = () => new Notification(title, { body: '¡Sesión completada!' })
        if (Notification.permission === 'granted') {
          show()
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => { if (p === 'granted') show() })
        }
      }
      handleDone()
    } else {
      setRemain(secs)
    }
  }

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 500)
  }

  useEffect(() => {
    // Request notification permission at screen load
    if (typeof document !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    const onVisible = () => {
      if (phaseRef.current === 'running') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (typeof document !== 'undefined') document.title = 'DailyOS'
    }
  }, [])

  const start = () => {
    endTimeRef.current = Date.now() + remaining * 1000
    setPhase('running')
    startInterval()
  }

  const pause = () => {
    setPhase('paused')
    endTimeRef.current = null
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const resume = () => {
    endTimeRef.current = Date.now() + remaining * 1000
    setPhase('running')
    startInterval()
  }

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    router.back()
  }

  const done = phase === 'done'
  const elapsed = totalSec - remaining
  const elapsedMin = Math.floor(elapsed / 60)

  return (
    <View style={[styles.bg, { backgroundColor: C.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <HStack style={styles.header}>
          <Pressable onPress={stop} style={[styles.closeBtn, { borderColor: C.borderLight, backgroundColor: C.surface }]}>
            <Text variant="captionMedium" color="secondary">✕ Salir</Text>
          </Pressable>
          <View style={[styles.typeDot, { backgroundColor: color }]} />
        </HStack>

        {/* Main */}
        <View style={styles.center}>

          {done ? (
            <VStack gap="lg" style={{ alignItems: 'center' }}>
              <View style={[styles.doneCircle, { borderColor: color, backgroundColor: C.surface }]}>
                <Text style={{ fontSize: 48 }}>✓</Text>
              </View>
              <VStack gap="xs" style={{ alignItems: 'center' }}>
                <Text variant="displayLarge" color="primary">Completado</Text>
                <Text variant="body" color="secondary">{elapsedMin} minutos de foco</Text>
              </VStack>
            </VStack>
          ) : (
            <VStack gap="xl" style={{ alignItems: 'center' }}>
              {/* Timer ring */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ring progress={progress} color={color} size={220} />
                <View style={StyleSheet.absoluteFill as any} pointerEvents="none">
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[styles.timerText, { color: C.textPrimary }]}>
                      {formatTime(remaining)}
                    </Text>
                    <Text variant="micro" color="tertiary" style={{ marginTop: 4 }}>
                      {phase === 'paused' ? 'PAUSADO' : phase === 'ready' ? 'LISTO' : 'EN FOCO'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Title */}
              <VStack gap="xs" style={{ alignItems: 'center' }}>
                <Text variant="title" color="primary" style={{ textAlign: 'center' }}>{title}</Text>
                <Text variant="caption" color="tertiary">{minutes} min · sesión de foco</Text>
              </VStack>
            </VStack>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {done ? (
            <Button label="Volver al plan" variant="primary" size="lg" onPress={stop} style={{ width: '100%' }} />
          ) : phase === 'ready' ? (
            <Button label="Empezar sesión →" variant="secondary" size="lg" onPress={start} style={{ width: '100%' }} />
          ) : (
            <HStack gap="md" style={{ width: '100%' }}>
              <Button
                label={phase === 'running' ? 'Pausar' : 'Continuar'}
                variant="secondary"
                size="lg"
                onPress={phase === 'running' ? pause : resume}
                style={{ flex: 1 }}
              />
              <Button label="Terminar" variant="ghost" size="lg" onPress={stop} style={{ flex: 1 }} />
            </HStack>
          )}
        </View>

      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  bg:       { flex: 1 },
  header:   {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  typeDot: { width: 10, height: 10, borderRadius: 5 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },

  timerText: {
    fontSize: 56,
    fontWeight: FontWeight.black,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },

  doneCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.brutal,
  },

  controls: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
})
