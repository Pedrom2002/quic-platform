export default function MarketingLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-40 bg-zinc-200 rounded" />
        <div className="h-9 w-32 bg-zinc-200 rounded" />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="h-10 bg-zinc-100 border-b" />
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-200/60" />
          ))}
        </div>
      </div>
    </div>
  )
}
