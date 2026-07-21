import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated'

export function MaterialCardSkeleton() {
  const shimmer = useSharedValue(-1)

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false)
  }, [shimmer])

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * 150 }],
  }))

  return (
    <View testID="material-card-skeleton" style={styles.card}>
      <View style={styles.image}>
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </View>
      <View style={styles.content}>
        <View style={styles.lineSmall} />
        <View style={styles.lineLarge} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 12, overflow: 'hidden', margin: 6 },
  image: { width: '100%', height: 120, backgroundColor: '#e7e5e4', overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, left: 0, width: 80, height: '100%', backgroundColor: 'rgba(255,255,255,0.4)' },
  content: { padding: 12, gap: 8 },
  lineSmall: { height: 8, width: '40%', backgroundColor: '#e7e5e4', borderRadius: 4 },
  lineLarge: { height: 12, width: '70%', backgroundColor: '#e7e5e4', borderRadius: 4 },
})
