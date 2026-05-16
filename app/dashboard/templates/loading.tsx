export default function TemplatesLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-zinc-200 rounded" />
      <div className="flex gap-2">
        <div className="h-9 w-64 bg-zinc-200 rounded-lg" />
        <div className="h-9 w-32 bg-zinc-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
