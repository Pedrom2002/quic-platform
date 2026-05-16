export default function EventsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-zinc-200 rounded" />
        <div className="h-9 w-28 bg-zinc-200 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
