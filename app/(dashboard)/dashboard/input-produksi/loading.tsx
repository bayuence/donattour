export default function InputProduksiLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
