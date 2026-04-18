import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

function SkeletonCard() {
  return (
    <Card className="w-full max-w-xs min-h-[24rem] rounded-lg bg-gray-800 pt-0">
      <CardHeader className="w-full h-2/5 p-0">
        <Skeleton className="w-full h-full rounded-t-lg" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 mx-auto" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex justify-center gap-2 mt-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

export function WishlistSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}