export default function StockLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-32 bg-zinc-200 rounded" />
          <div className="h-4 w-64 bg-zinc-200 rounded" />
        </div>
        <div className="h-9 w-44 bg-zinc-200 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
