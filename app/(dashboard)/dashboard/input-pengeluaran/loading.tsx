export default function InputPengeluaranLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 animate-pulse">
      <div className="h-8 w-44 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
        ))}
        <div className="h-10 w-full bg-orange-100 rounded-xl" />
      </div>

      {/* Expense list skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="space-y-1">
              <div className="h-3 w-28 bg-gray-200 rounded" />
              <div className="h-2 w-16 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
