export default function FilesLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-zinc-200 rounded" />
      <div className="h-9 w-48 bg-zinc-200 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
