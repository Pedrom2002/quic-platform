import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400">{message}</p>
    </div>
  )
}
