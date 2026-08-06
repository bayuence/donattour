export default function KelolaKaryawanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* RENDER CONTENT */}
      <div className="animate-in fade-in duration-300">
        {children}
      </div>
    </div>
  );
}
