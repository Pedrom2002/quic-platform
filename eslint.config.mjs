import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    // TODO: fix these React 19 strict rules in UI components
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['.next/', 'node_modules/', 'coverage/'],
  },
]

export default config
