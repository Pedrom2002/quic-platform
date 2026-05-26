'use client'

import Link from 'next/link'
import type { Route } from 'next'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Users, LayoutDashboard, FileText, Settings, LogOut, Users2, FolderOpen, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/events', label: 'Eventos', icon: Calendar },
  { href: '/dashboard/contacts', label: 'Contactos', icon: Users },
  { href: '/dashboard/team', label: 'Equipa', icon: Users2 },
  { href: '/dashboard/templates', label: 'Templates', icon: FileText },
  { href: '/dashboard/files', label: 'Ficheiros', icon: FolderOpen },
  { href: '/dashboard/marketing', label: 'Marketing', icon: Mail },
]

interface SidebarProps {
  userName: string
  userEmail: string
  orgName: string
}

export function Sidebar({ userName, userEmail, orgName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-60 min-h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Logo / Org */}
      <div className="flex items-center px-4 py-4 border-b border-zinc-800 shrink-0">
        <Image src="/logo-branco.png" alt="Quic" width={130} height={52} className="shrink-0" />
      </div>

      {/* Nav */}
      <nav aria-label="Navegação principal" className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User / Bottom */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0" aria-hidden="true">
            <span className="text-xs font-semibold text-zinc-200">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{userName}</p>
            <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
          </div>
          <Link
            href="/dashboard/settings"
            aria-label="Definições"
            className="p-1 rounded text-zinc-500 hover:text-white focus-visible:opacity-100"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Terminar sessão"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          Terminar sessão
        </button>
      </div>
    </aside>
  )
}
