import { Image, View, StyleSheet, type ImageSourcePropType } from 'react-native'

export function BannerHeader({ source }: { source: ImageSourcePropType }) {
  return (
    <>
      <Image
        testID="banner-header-image"
        source={source}
        style={styles.banner}
        resizeMode="cover"
      />
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
