import { TextInput, TextInputProps, StyleSheet } from 'react-native'

export function AuthTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#78716c"
      style={styles.input}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontSize: 14,
  },
})
