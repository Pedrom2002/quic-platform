import { Image, View, StyleSheet, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface BannerHeaderProps {
  source: ImageSourcePropType
}

export function BannerHeader({ source }: BannerHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <>
      <View testID="banner-header-wrapper">
        <Image
          testID="banner-header-image"
          source={source}
          style={[styles.banner, { height: 220 + insets.top }]}
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
  },
  // Margem minima para nada ficar colado diretamente a base do banner.
  spacer: {
    height: 8,
  },
})
