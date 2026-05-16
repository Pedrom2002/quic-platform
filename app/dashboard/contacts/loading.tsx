export default function ContactsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-zinc-200 rounded" />
      <div className="flex gap-2">
        <div className="h-9 w-64 bg-zinc-200 rounded-lg" />
        <div className="h-9 w-24 bg-zinc-200 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
