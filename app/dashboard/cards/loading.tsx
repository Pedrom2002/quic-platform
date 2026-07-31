export default function CardsLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-20 bg-zinc-200 rounded" />
          <div className="h-4 w-48 bg-zinc-200 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
