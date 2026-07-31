import { Image, StyleSheet, type ImageSourcePropType } from 'react-native'

export function BannerHeader({ source }: { source: ImageSourcePropType }) {
  return (
    <Image
      testID="banner-header-image"
      source={source}
      style={styles.banner}
      resizeMode="cover"
    />
  )
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    height: 220,
  },
})
