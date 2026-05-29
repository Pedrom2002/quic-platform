import { MarketingSubNav } from '@/components/marketing/SubNav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <MarketingSubNav />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
