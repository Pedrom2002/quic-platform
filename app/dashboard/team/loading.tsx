export default function TeamLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-zinc-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
