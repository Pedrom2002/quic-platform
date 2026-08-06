// mobile/app/(tabs)/golden-circle.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { BannerHeader } from '../../components/BannerHeader'
import { colors } from '../../lib/theme'

export default function GoldenCircleScreen() {
  const player = useVideoPlayer(require('../../assets/videos/golden-circle.mp4'), p => {
    p.loop = false
    p.muted = false
  })

  return (
    <View style={styles.container}>
      <BannerHeader source={require('../../assets/banners/golden-circle.png')} />

      <View style={styles.body}>
        <Text style={styles.title}>Golden Circle</Text>

        <VideoView
          style={styles.video}
          player={player}
          nativeControls
          contentFit="cover"
        />

        <Pressable style={styles.cta} accessibilityRole="button">
          <Text style={styles.ctaText}>Junta-te em Gold</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  body: { padding: 16, alignItems: 'center', gap: 20 },
  title: { color: colors.gray900, fontSize: 22, fontWeight: 'bold' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: colors.gray100 },
  cta: {
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  ctaText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
})
