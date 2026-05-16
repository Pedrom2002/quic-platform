export default function EventDetailLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-zinc-200 rounded" />
        <div className="h-8 w-64 bg-zinc-200 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-zinc-200 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-zinc-200 rounded-xl" />
      <div className="h-64 bg-zinc-200 rounded-xl" />
    </div>
  )
}
