export const colors = {
  brand: '#951b81',

  // Gray scale (stone palette) used across catalog/portal/tickets/pedido screens
  gray50: '#fafaf9',
  gray100: '#f5f5f4',
  gray200: '#e7e5e4',
  gray300: '#d6d3d1',
  gray400: '#a8a29e',
  gray500: '#78716c',
  gray600: '#57534e',
  gray700: '#44403c',
  gray900: '#1c1917',

  white: '#ffffff',
  black: '#000000',

  // Semantic danger/error red. #b91c1c is canonical (used across most screens);
  // dangerOnDark is the lighter tint needed for contrast on the dark auth screens.
  danger: '#b91c1c',
  dangerOnDark: '#FCA5A5',

  // Dark "auth" mode used only by login/signup (video background + gradient overlay)
  authScreen: {
    background: '#0A0A0F',
    overlayNear: 'rgba(20,10,35,0.4)',
    overlayFar: 'rgba(10,6,20,0.78)',
    linkText: 'rgba(245,243,250,0.55)',
  },
} as const

/** @deprecated use colors.brand */
export const QUIC_MAGENTA = colors.brand
