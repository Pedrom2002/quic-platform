'use client'

import { Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactGroup } from '@/app/dashboard/contacts/actions'

interface Props {
  groups: ContactGroup[]
  selectedGroupId: string | null
  onSelectGroup: (id: string | null) => void
  totalCount: number
  ungroupedCount: number
  isAdmin: boolean
  onNewGroup: () => void
}

export function GroupsPanel({
  groups,
  selectedGroupId,
  onSelectGroup,
  totalCount,
  ungroupedCount,
  isAdmin,
  onNewGroup,
}: Props) {
  return (
    <div className="w-60 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Grupos</span>
        <button
          onClick={onNewGroup}
          className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Novo grupo"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <GroupItem
          label="Todos"
          count={totalCount}
          active={selectedGroupId === null}
          onClick={() => onSelectGroup(null)}
          icon={<Users className="w-3.5 h-3.5" />}
        />

        <GroupItem
          label="Sem grupo"
          count={ungroupedCount}
          active={selectedGroupId === 'none'}
          onClick={() => onSelectGroup('none')}
          muted
        />

        {groups.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 pb-1">Grupos</p>
            {groups.map(g => (
              <GroupItem
                key={g.id}
                label={g.name}
                count={undefined}
                active={selectedGroupId === g.id}
                onClick={() => onSelectGroup(g.id)}
                color={g.color ?? '#6366f1'}
                adminOnly={g.admin_only}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface GroupItemProps {
  label: string
  count?: number
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  color?: string
  muted?: boolean
  adminOnly?: boolean
}

function GroupItem({ label, count, active, onClick, icon, color, muted, adminOnly }: GroupItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
        active
          ? 'bg-zinc-800 text-zinc-100'
          : muted
            ? 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      )}
    >
      {icon ? (
        <span className="text-zinc-500">{icon}</span>
      ) : color ? (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      ) : null}

      <span className="flex-1 truncate">{label}</span>

      {adminOnly && (
        <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
          Admin
        </span>
      )}

      {count !== undefined && (
        <span className={cn('text-xs px-1.5 rounded', active ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-900 text-zinc-600')}>
          {count}
        </span>
      )}
    </button>
  )
}
