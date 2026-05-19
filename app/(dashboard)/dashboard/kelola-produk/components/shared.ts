export const inputClass = 'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white focus:shadow-lg focus:shadow-amber-500/5 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-300';

export const WARNA_OPTIONS = ['amber', 'blue', 'purple', 'green', 'rose', 'pink', 'indigo', 'emerald'] as const;

export const getColorClasses = (color: string) => {
  const map: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-500',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-500',
    green: 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-500',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500',
    pink: 'bg-pink-50 text-pink-600 border-pink-100 group-hover:bg-pink-500',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-500',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500',
  };
  return map[color] || map.amber;
};

export const getTextHoverClasses = (color: string) => {
  const map: Record<string, string> = {
    amber: 'group-hover:text-amber-600',
    blue: 'group-hover:text-blue-600',
    purple: 'group-hover:text-purple-600',
    green: 'group-hover:text-green-600',
    rose: 'group-hover:text-rose-600',
    pink: 'group-hover:text-pink-600',
    indigo: 'group-hover:text-indigo-600',
    emerald: 'group-hover:text-emerald-600',
  };
  return map[color] || map.amber;
};

export const formatRp = (n: number | undefined | null) => {
  if (typeof n !== 'number') return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
