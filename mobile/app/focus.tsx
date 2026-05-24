import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Pressable, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Text, Button, VStack, HStack } from '@/components/ui'
import { Colors, Spacing, Radius, Shadow, FontWeight } from '@/constants/tokens'

type Phase = 'ready' | 'running' | 'paused' | 'done'

function pad(n: number) { return String(n).padStart(2, '0') }

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${pad(m)}:${pad(s)}`
}

function Ring({ progress, color, size = 240 }: { progress: number; color: string; size?: number }) {
  const stroke = 6
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)))

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: Colors.surface2,
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
  const router = useRouter()
  const params = useLocalSearchParams<{ title?: string; minutes?: string; color?: string }>()

  const title    = params.title   ?? 'Sesión de foco'
  const minutes  = parseInt(params.minutes ?? '25')
  const color    = params.color   ?? Colors.indigo
  const totalSec = minutes * 60

  const [phase, setPhase]       = useState<Phase>('ready')
  const [remaining, setRemain]  = useState(totalSec)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const progress = remaining / totalSec

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const start = () => {
    setPhase('running')
    intervalRef.current = setInterval(() => {
      setRemain(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          setPhase('done')
          return 0
        }
        return r - 1
      })
    }, 1000)
  }

  const pause = () => {
    setPhase('paused')
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const resume = () => {
    setPhase('running')
    intervalRef.current = setInterval(() => {
      setRemain(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          setPhase('done')
          return 0
        }
        return r - 1
      })
    }, 1000)
  }

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    router.back()
  }

  const done = phase === 'done'
  const elapsed = totalSec - remaining
  const elapsedMin = Math.floor(elapsed / 60)

  return (
    <View style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <HStack style={styles.header}>
          <Pressable onPress={stop} style={styles.closeBtn}>
            <Text variant="captionMedium" color="secondary">✕ Salir</Text>
          </Pressable>
          <View style={[styles.typeDot, { backgroundColor: color }]} />
        </HStack>

        {/* Main */}
        <View style={styles.center}>

          {done ? (
            <VStack gap="lg" style={{ alignItems: 'center' }}>
              <View style={[styles.doneCircle, { borderColor: color }]}>
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
                    <Text style={[styles.timerText, { color: Colors.textPrimary }]}>
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
  bg:       { flex: 1, backgroundColor: Colors.bg },
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
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
    ...Shadow.brutal,
  },

  controls: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
})
