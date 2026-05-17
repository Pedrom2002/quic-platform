export default function TasksLoading() {
  return (
    <div className="p-6 space-y-3 animate-pulse">
      <div className="h-7 w-32 bg-slate-200 rounded mb-4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-200 rounded-xl" />
      ))}
    </div>
  )
}
