// Helper functions untuk Laporan Harian Outlet

export const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export const formatTanggalHariIni = (date: Date) => {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
};

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

export const formatTimeShort = (date: Date) => {
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};
