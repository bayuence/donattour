export default function LaporanHarianLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 animate-pulse">
      {/* Sticky header skeleton */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100">
        <div className="space-y-1">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-gray-200 rounded-lg" />
          <div className="h-8 w-20 bg-orange-100 rounded-lg" />
        </div>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-6 w-28 bg-gray-200 rounded" />
            <div className="h-2 w-full bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>

      {/* Sales table skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-8 w-8 bg-gray-200 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
              <div className="h-2 w-1/2 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-16 bg-orange-100 rounded flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Expense list skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded-lg" />
              <div className="space-y-1">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-2 w-16 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
