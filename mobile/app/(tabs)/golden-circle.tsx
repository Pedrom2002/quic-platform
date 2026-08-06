// mobile/app/(tabs)/golden-circle.tsx
import { useCallback, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useFocusEffect } from 'expo-router'
import { BannerHeader } from '../../components/BannerHeader'
import { colors } from '../../lib/theme'

export default function GoldenCircleScreen() {
  const [controlsVisible, setControlsVisible] = useState(false)
  const player = useVideoPlayer(require('../../assets/videos/golden-circle.mp4'), p => {
    p.loop = false
    p.muted = false
  })

  // Para o video quando a tab perde foco (ex: utilizador navega para outra
  // tab), para nao continuar a tocar em background fora de vista.
  useFocusEffect(
    useCallback(() => {
      player.play()
      return () => player.pause()
    }, [player])
  )

  return (
    <View style={styles.container}>
      <BannerHeader
        source={require('../../assets/banners/golden-circle.png')}
        topInsetColor="#81166F"
      />

      <View style={styles.body}>
        <Text style={styles.title}>O que é o Golden Circle?</Text>

        <Pressable
          onPress={() => setControlsVisible(true)}
          style={styles.videoWrapper}
          accessibilityRole="button"
          accessibilityLabel="Mostrar controlos do vídeo"
        >
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={controlsVisible}
            contentFit="cover"
          />
        </Pressable>

        <Pressable style={styles.cta} accessibilityRole="button">
          <Text style={styles.ctaText}>Junta-te ao Golden Circle</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  body: { padding: 16, alignItems: 'center', gap: 20 },
  title: { color: colors.gray900, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  videoWrapper: { width: '100%' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: colors.gray100 },
  cta: {
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  ctaText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
})
