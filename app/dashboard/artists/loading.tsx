export default function ArtistsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-28 bg-zinc-200 rounded" />
          <div className="h-4 w-80 bg-zinc-200 rounded" />
        </div>
        <div className="h-9 w-32 bg-zinc-200 rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-10 bg-zinc-200 rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
