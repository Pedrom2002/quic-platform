import { Image, View, StyleSheet, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function BannerHeader({ source }: { source: ImageSourcePropType }) {
  const insets = useSafeAreaInsets()

  return (
    <>
      <View testID="banner-header-wrapper" style={{ paddingTop: insets.top }}>
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
