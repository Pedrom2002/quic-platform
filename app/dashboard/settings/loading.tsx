export default function SettingsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse max-w-2xl">
      <div className="h-8 w-36 bg-zinc-200 rounded" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 bg-zinc-200 rounded" />
            <div className="h-10 bg-zinc-200 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="h-10 w-32 bg-zinc-200 rounded-lg" />
    </div>
  )
}
