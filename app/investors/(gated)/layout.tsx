// app/investors/(gated)/layout.tsx
import { redirect } from 'next/navigation'
import { getInvestorProfile } from '@/lib/investors/get-profile'
import { Nav } from '@/components/investors/Nav'

export default async function InvestorsGatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getInvestorProfile()

  if (!session.authenticated) redirect('/investors/login')
  if (!session.profile || session.profile.status !== 'approved') redirect('/investors/pending')

  return (
    <div className="flex min-h-screen bg-white">
      <Nav userName={session.profile.fullName} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
