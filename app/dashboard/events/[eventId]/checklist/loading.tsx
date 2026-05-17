export default function ChecklistLoading() {
  return (
    <div className="p-6 space-y-3 animate-pulse">
      <div className="h-7 w-40 bg-slate-200 rounded mb-4" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-200 rounded-xl" />
      ))}
    </div>
  )
}
