import { Skeleton } from '@/components/ui/skeleton'

export default function InvestorsPublicLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-10 w-32 mx-auto bg-zinc-800" />
        <Skeleton className="h-6 w-3/4 mx-auto bg-zinc-800" />
        <Skeleton className="h-40 w-full bg-zinc-800" />
      </div>
    </div>
  )
}
