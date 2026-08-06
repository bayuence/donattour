export default function KasirLoading() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row h-screen animate-pulse overflow-hidden">
      {/* Menu panel skeleton */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 bg-gray-200 rounded-lg" />
          <div className="h-8 w-24 bg-gray-200 rounded-lg" />
        </div>

        {/* Category tabs skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-gray-200 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1 overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
              <div className="h-20 bg-gray-200 rounded-lg w-full" />
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-orange-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Cart panel skeleton — desktop only */}
      <div className="hidden lg:flex w-80 border-l border-gray-100 flex-col p-4 gap-3">
        <div className="h-6 w-24 bg-gray-200 rounded" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-full bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t pt-3">
          <div className="flex justify-between">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-12 w-full bg-orange-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
