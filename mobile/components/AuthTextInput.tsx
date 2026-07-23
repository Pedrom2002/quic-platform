import { useState } from 'react'
import { TextInput, TextInputProps, StyleSheet } from 'react-native'

export function AuthTextInput(props: TextInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      placeholderTextColor="rgba(245,243,250,0.4)"
      style={[styles.input, focused && styles.inputFocused]}
      autoCapitalize="none"
      autoCorrect={false}
      onFocus={e => {
        setFocused(true)
        props.onFocus?.(e)
      }}
      onBlur={e => {
        setFocused(false)
        props.onBlur?.(e)
      }}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: 'rgba(245,243,250,0.14)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#F5F3FA',
    backgroundColor: 'rgba(20,14,32,0.45)',
    fontSize: 14,
  },
  inputFocused: {
    borderColor: 'rgba(139,47,201,0.65)',
    backgroundColor: 'rgba(30,18,48,0.6)',
  },
})
