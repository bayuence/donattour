export default function TransaksiLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="h-8 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-6 w-28 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-20 bg-gray-200 rounded-full" />
        ))}
        <div className="h-9 w-36 bg-gray-200 rounded-lg ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 flex-1 bg-gray-200 rounded" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-3 w-24 bg-gray-200 rounded flex-shrink-0" />
            <div className="h-3 flex-1 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded flex-shrink-0" />
            <div className="h-3 flex-1 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-green-100 rounded-full flex-shrink-0" />
            <div className="h-3 w-20 bg-gray-200 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
