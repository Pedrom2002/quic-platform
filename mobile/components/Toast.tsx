import { useEffect, useRef } from 'react'
import { Text, Pressable, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { colors } from '../lib/theme'

export function Toast({
  message,
  onHide,
  durationMs = 1500,
  actionLabel,
  onAction,
}: {
  message: string
  onHide: () => void
  durationMs?: number
  actionLabel?: string
  onAction?: () => void
}) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timeout.current = setTimeout(onHide, durationMs)
    return () => {
      if (timeout.current) clearTimeout(timeout.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message])

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={styles.toast}
      pointerEvents={actionLabel ? 'auto' : 'none'}
    >
      <Text style={styles.text}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={() => {
            if (timeout.current) clearTimeout(timeout.current)
            onAction()
            onHide()
          }}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: colors.gray900,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { color: colors.white, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  actionText: { color: colors.gold, fontSize: 13, fontWeight: '700', marginLeft: 12 },
})
