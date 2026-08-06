export default function RiwayatProduksiLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 bg-gray-200 rounded-lg" />
        <div className="h-8 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Filter row */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 rounded-lg" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 flex-1 bg-gray-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-3 flex-1 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-blue-100 rounded-full" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
