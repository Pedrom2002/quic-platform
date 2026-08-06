import { Image, View, StyleSheet, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface BannerHeaderProps {
  source: ImageSourcePropType
  // Cor de fundo do espaco reservado para a status bar/notch, para nao
  // ficar branco a destacar contra o banner. Deve corresponder a cor
  // dominante do topo da imagem passada em `source`.
  topInsetColor?: string
}

export function BannerHeader({ source, topInsetColor = '#ffffff' }: BannerHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <>
      <View
        testID="banner-header-wrapper"
        style={{ paddingTop: insets.top, backgroundColor: topInsetColor }}
      >
        <Image
          testID="banner-header-image"
          source={source}
          style={styles.banner}
          resizeMode="cover"
        />
      </View>
      <View testID="banner-header-spacer" style={styles.spacer} />
    </>
  )
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    height: 220,
  },
  // Margem minima para nada ficar colado diretamente a base do banner.
  spacer: {
    height: 8,
  },
})
