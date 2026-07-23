import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    // Legacy components predating the React 19 compiler lint rules.
    // Scoped off here (instead of globally) so all NEW/other code is held to
    // the standard. Tracked for incremental refactor.
    files: [
      'app/dashboard/page.tsx',
      // glob (not literal): brackets in [...token] are a minimatch char-class
      '**/PortalClient.tsx',
      'components/contacts/EditContactDialog.tsx',
      'components/events/ChecklistBoard.tsx',
      'components/events/TaskDetailPanel.tsx',
      'components/events/TaskSidePanel.tsx',
      'components/events/checklist/ChecklistItemRow.tsx',
    ],
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // .worktrees/.claude: cópias locais de worktrees (não existem no CI)
    // mobile/: subprojeto Expo/React Native com toolchain e lint próprios;
    // as regras do React Compiler (web) dão falsos positivos em código RN
    // (ex.: mutar shared values do reanimated, alt-text em <Image> nativa).
    ignores: ['.next/', 'node_modules/', 'coverage/', '.worktrees/', '.claude/', 'mobile/'],
  },
]

export default config
