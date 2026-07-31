import { Skeleton } from "@/components/ui/skeleton"

export default function MarketingLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="h-10 bg-zinc-100 border-b" />
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-none" />
          ))}
        </div>
      </div>
    </div>
  )
}
