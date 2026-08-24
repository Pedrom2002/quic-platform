import { GoldenCircleTabs } from './golden-circle-tabs'

export default function GoldenCircleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Golden Circle</h1>
      <GoldenCircleTabs />
      {children}
    </div>
  )
}
