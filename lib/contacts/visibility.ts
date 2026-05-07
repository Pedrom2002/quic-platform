export function isContactVisibleToMember(
  groups: Array<{ admin_only: boolean }>
): boolean {
  if (groups.length === 0) return true
  return groups.some(g => !g.admin_only)
}
