export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      </div>

      {/* KPI strip skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
            <div className="h-3 w-16 bg-gray-200 rounded" />
            <div className="h-6 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
