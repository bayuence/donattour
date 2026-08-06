export default function KelolaProdukLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="h-8 w-32 bg-orange-100 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-200 rounded-t-lg" />
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="h-24 bg-gray-100 rounded-lg w-full" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
            <div className="flex justify-between items-center">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-6 w-12 bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
