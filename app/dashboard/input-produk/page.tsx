'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type TabType = 'produksi' | 'gagal-produksi' | 'batal-beli';
type UkuranDonat = 'standar' | 'mini';

// Tim dapur lapor ke kasir: "Aku sudah buat donat X pcs"
interface ProduksiRecord {
  id: string;
  waktu: string;
  ukuran: UkuranDonat;
  jumlah: number;
  catatan: string;
}

// Donat polos rusak saat diproduksi
interface GagalProduksiRecord {
  id: string;
  waktu: string;
  ukuran: UkuranDonat;
  jumlah: number;
  alasan: string;
}

// Donat sudah ditoping untuk pesanan tapi pelanggan batal beli
interface BatalBeliRecord {
  id: string;
  waktu: string;
  ukuran: UkuranDonat;
  produk: string; // donat bertoping yang batal
  jumlah: number;
  catatan: string;
}

const ALASAN_GAGAL_PRODUKSI = [
  'Gosong',
  'Adonan gagal',
  'Bentuk hancur',
  'Terlalu keras',
  'Terlalu lembek',
  'Lainnya',
];

const DAFTAR_DONAT_TOPING = [
  'Donat Gula',
  'Donat Cokelat',
  'Donat Keju',
  'Donat Strawberry',
  'Donat Matcha',
];

export default function InputProdukPage() {
  const [activeTab, setActiveTab] = useState<TabType>('produksi');

  // === State Produksi Donat Polos ===
  const [produksiRecords, setProduksiRecords] = useState<ProduksiRecord[]>([]);
  const [produksiForm, setProduksiForm] = useState({ jumlah: '', catatan: '', ukuran: 'standar' as UkuranDonat });

  // === State Gagal Produksi (donat polos rusak) ===
  const [gagalRecords, setGagalRecords] = useState<GagalProduksiRecord[]>([]);
  const [gagalForm, setGagalForm] = useState({ jumlah: '', alasan: ALASAN_GAGAL_PRODUKSI[0], ukuran: 'standar' as UkuranDonat });

  // === State Batal Beli (donat bertoping batal) ===
  const [batalRecords, setBatalRecords] = useState<BatalBeliRecord[]>([]);
  const [batalForm, setBatalForm] = useState({ produk: DAFTAR_DONAT_TOPING[0], jumlah: '', catatan: '', ukuran: 'standar' as UkuranDonat });

  // === Demo: donat sudah ditoping/terjual dari POS ===
  const [sudahDitopingStandar] = useState(0);
  const [sudahDitopingMini] = useState(0);

  // === Handlers ===
  const handleSubmitProduksi = (e: React.FormEvent) => {
    e.preventDefault();
    const jml = parseInt(produksiForm.jumlah);
    if (!jml || jml <= 0) return;
    setProduksiRecords([{
      id: `prod-${Date.now()}`, waktu: new Date().toISOString(),
      ukuran: produksiForm.ukuran, jumlah: jml, catatan: produksiForm.catatan,
    }, ...produksiRecords]);
    setProduksiForm({ jumlah: '', catatan: '', ukuran: produksiForm.ukuran });
  };

  const handleSubmitGagal = (e: React.FormEvent) => {
    e.preventDefault();
    const jml = parseInt(gagalForm.jumlah);
    if (!jml || jml <= 0) return;
    setGagalRecords([{
      id: `gagal-${Date.now()}`, waktu: new Date().toISOString(),
      ukuran: gagalForm.ukuran, jumlah: jml, alasan: gagalForm.alasan,
    }, ...gagalRecords]);
    setGagalForm({ jumlah: '', alasan: ALASAN_GAGAL_PRODUKSI[0], ukuran: gagalForm.ukuran });
  };

  const handleSubmitBatal = (e: React.FormEvent) => {
    e.preventDefault();
    const jml = parseInt(batalForm.jumlah);
    if (!jml || jml <= 0) return;
    setBatalRecords([{
      id: `batal-${Date.now()}`, waktu: new Date().toISOString(),
      ukuran: batalForm.ukuran, produk: batalForm.produk, jumlah: jml, catatan: batalForm.catatan,
    }, ...batalRecords]);
    setBatalForm({ produk: DAFTAR_DONAT_TOPING[0], jumlah: '', catatan: '', ukuran: batalForm.ukuran });
  };

  // === Kalkulasi per ukuran ===
  const totalProduksiStandar = produksiRecords.filter(r => r.ukuran === 'standar').reduce((s, r) => s + r.jumlah, 0);
  const totalProduksiMini = produksiRecords.filter(r => r.ukuran === 'mini').reduce((s, r) => s + r.jumlah, 0);
  const totalProduksi = totalProduksiStandar + totalProduksiMini;

  const totalGagalStandar = gagalRecords.filter(r => r.ukuran === 'standar').reduce((s, r) => s + r.jumlah, 0);
  const totalGagalMini = gagalRecords.filter(r => r.ukuran === 'mini').reduce((s, r) => s + r.jumlah, 0);
  const totalGagalProduksi = totalGagalStandar + totalGagalMini;

  const totalBatalStandar = batalRecords.filter(r => r.ukuran === 'standar').reduce((s, r) => s + r.jumlah, 0);
  const totalBatalMini = batalRecords.filter(r => r.ukuran === 'mini').reduce((s, r) => s + r.jumlah, 0);
  const totalBatalBeli = totalBatalStandar + totalBatalMini;

  const sisaStandar = totalProduksiStandar - totalGagalStandar - sudahDitopingStandar;
  const sisaMini = totalProduksiMini - totalGagalMini - sudahDitopingMini;

  const tabs: { key: TabType; label: string; badge: string }[] = [
    { key: 'produksi', label: '🍩 Produksi Donat', badge: `${totalProduksi}` },
    { key: 'gagal-produksi', label: '🔥 Gagal Produksi', badge: `${totalGagalProduksi}` },
    { key: 'batal-beli', label: '🚫 Batal Beli', badge: `${totalBatalBeli}` },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🍩 Input Produk</h2>
        <p className="text-sm text-gray-500">Catat produksi donat dari tim dapur, donat gagal, dan pesanan batal</p>
      </div>

      {/* ══════ Alur Donat ══════ */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">📊 Alur Donat Hari Ini</h3>

        {/* Donat Standar */}
        <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">🍩 Donat Standar</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Produksi</p>
            <p className="text-xl font-bold text-blue-600">{totalProduksiStandar}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Gagal</p>
            <p className="text-xl font-bold text-red-600">-{totalGagalStandar}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Ditoping</p>
            <p className="text-xl font-bold text-green-600">-{sudahDitopingStandar}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Sisa Polos</p>
            <p className="text-xl font-bold text-amber-600">{sisaStandar < 0 ? 0 : sisaStandar}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Batal Beli</p>
            <p className="text-xl font-bold text-purple-600">{totalBatalStandar}</p>
          </div>
        </div>

        {/* Donat Mini */}
        <p className="text-xs font-bold text-pink-700 mb-2 flex items-center gap-1">🧁 Donat Mini</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Produksi</p>
            <p className="text-xl font-bold text-blue-600">{totalProduksiMini}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Gagal</p>
            <p className="text-xl font-bold text-red-600">-{totalGagalMini}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Ditoping</p>
            <p className="text-xl font-bold text-green-600">-{sudahDitopingMini}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Sisa Polos</p>
            <p className="text-xl font-bold text-amber-600">{sisaMini < 0 ? 0 : sisaMini}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Batal Beli</p>
            <p className="text-xl font-bold text-purple-600">{totalBatalMini}</p>
          </div>
        </div>

        {/* Total gabungan */}
        <div className="bg-gray-50 border rounded-lg p-3 flex flex-wrap gap-4 justify-center text-center">
          <div>
            <p className="text-xs text-gray-500">Total Produksi</p>
            <p className="text-lg font-bold text-blue-700">{totalProduksi}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Gagal</p>
            <p className="text-lg font-bold text-red-700">{totalGagalProduksi}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Batal</p>
            <p className="text-lg font-bold text-purple-700">{totalBatalBeli}</p>
          </div>
        </div>

        {/* Visual flow */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-bold text-gray-700">Alur:</span>{' '}
            Tim Dapur produksi donat polos (Standar / Mini) → Kasir catat jumlah & ukuran →
            Ada pesanan → Tim Toping buat donat bertoping → Stok donat polos berkurang →
            Jika donat polos rusak = <span className="text-red-600 font-medium">Gagal Produksi</span> |
            Jika pelanggan batal beli donat bertoping = <span className="text-purple-600 font-medium">Batal Beli</span>
          </p>
        </div>
      </div>

      {/* ══════ Tabs ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-3 text-sm font-bold transition-colors ${activeTab === tab.key ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
              <span className="ml-1 text-xs bg-gray-100 rounded-full px-2 py-0.5">{tab.badge}</span>
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ═══════════ TAB: PRODUKSI DONAT ═══════════ */}
          {activeTab === 'produksi' && (
            <div>
              <form onSubmit={handleSubmitProduksi} className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-5 space-y-4">
                <h3 className="font-bold text-gray-900">📥 Tim Dapur Lapor Produksi</h3>
                <p className="text-xs text-gray-500 -mt-2">Catat jumlah donat polos (tanpa toping) yang diproduksi tim dapur</p>

                {/* Ukuran toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran Donat</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setProduksiForm({ ...produksiForm, ukuran: 'standar' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${produksiForm.ukuran === 'standar' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:border-amber-300'}`}>
                      🍩 Standar
                    </button>
                    <button type="button" onClick={() => setProduksiForm({ ...produksiForm, ukuran: 'mini' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${produksiForm.ukuran === 'mini' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-600 border-gray-300 hover:border-pink-300'}`}>
                      🧁 Mini
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Donat Polos</label>
                    <input type="number" min="1" value={produksiForm.jumlah}
                      onChange={(e) => setProduksiForm({ ...produksiForm, jumlah: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-lg font-bold"
                      placeholder="Contoh: 100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                    <input type="text" value={produksiForm.catatan}
                      onChange={(e) => setProduksiForm({ ...produksiForm, catatan: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="Contoh: Batch pagi, Tambahan siang, dll" />
                  </div>
                </div>
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold">
                  + Catat Produksi Donat {produksiForm.ukuran === 'mini' ? 'Mini' : 'Standar'}
                </Button>
              </form>

              <h4 className="text-sm font-bold text-gray-700 mb-2">Riwayat Produksi Hari Ini</h4>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ukuran</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Jumlah</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {produksiRecords.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Tim dapur belum lapor produksi hari ini</td></tr>
                  ) : (
                    <>
                      {produksiRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(r.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                              {r.ukuran === 'mini' ? '🧁 Mini' : '🍩 Standar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">+{r.jumlah} pcs</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{r.catatan || '-'}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                        <td></td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{totalProduksi} pcs</td>
                        <td className="px-4 py-3 text-xs text-gray-500">Standar: {totalProduksiStandar} | Mini: {totalProduksiMini}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══════════ TAB: GAGAL PRODUKSI ═══════════ */}
          {activeTab === 'gagal-produksi' && (
            <div>
              <form onSubmit={handleSubmitGagal} className="bg-red-50/50 border border-red-100 rounded-lg p-4 mb-5 space-y-4">
                <h3 className="font-bold text-gray-900">🔥 Donat Polos Gagal / Rusak</h3>
                <p className="text-xs text-gray-500 -mt-2">Donat polos (tanpa toping) yang rusak saat diproduksi oleh tim dapur</p>

                {/* Ukuran toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran Donat</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGagalForm({ ...gagalForm, ukuran: 'standar' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${gagalForm.ukuran === 'standar' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:border-amber-300'}`}>
                      🍩 Standar
                    </button>
                    <button type="button" onClick={() => setGagalForm({ ...gagalForm, ukuran: 'mini' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${gagalForm.ukuran === 'mini' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-600 border-gray-300 hover:border-pink-300'}`}>
                      🧁 Mini
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Gagal</label>
                    <input type="number" min="1" value={gagalForm.jumlah}
                      onChange={(e) => setGagalForm({ ...gagalForm, jumlah: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-red-500 text-lg font-bold"
                      placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Gagal</label>
                    <select value={gagalForm.alasan}
                      onChange={(e) => setGagalForm({ ...gagalForm, alasan: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-red-500">
                      {ALASAN_GAGAL_PRODUKSI.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <Button type="submit" className="bg-red-500 hover:bg-red-600 text-white font-bold">
                  + Catat Gagal Produksi {gagalForm.ukuran === 'mini' ? 'Mini' : 'Standar'}
                </Button>
              </form>

              <h4 className="text-sm font-bold text-gray-700 mb-2">Riwayat Gagal Produksi Hari Ini</h4>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ukuran</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Jumlah</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gagalRecords.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Belum ada donat gagal produksi hari ini 🎉</td></tr>
                  ) : (
                    <>
                      {gagalRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(r.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                              {r.ukuran === 'mini' ? '🧁 Mini' : '🍩 Standar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{r.jumlah} pcs</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{r.alasan}</td>
                        </tr>
                      ))}
                      <tr className="bg-red-50">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                        <td></td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-red-700">{totalGagalProduksi} pcs</td>
                        <td className="px-4 py-3 text-xs text-gray-500">Standar: {totalGagalStandar} | Mini: {totalGagalMini}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══════════ TAB: BATAL BELI ═══════════ */}
          {activeTab === 'batal-beli' && (
            <div>
              <form onSubmit={handleSubmitBatal} className="bg-purple-50/50 border border-purple-100 rounded-lg p-4 mb-5 space-y-4">
                <h3 className="font-bold text-gray-900">🚫 Donat Batal Beli</h3>
                <p className="text-xs text-gray-500 -mt-2">Donat yang sudah ditoping untuk pesanan tapi pelanggan batal beli / tidak jadi ambil</p>

                {/* Ukuran toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran Donat</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setBatalForm({ ...batalForm, ukuran: 'standar' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${batalForm.ukuran === 'standar' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:border-amber-300'}`}>
                      🍩 Standar
                    </button>
                    <button type="button" onClick={() => setBatalForm({ ...batalForm, ukuran: 'mini' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${batalForm.ukuran === 'mini' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-600 border-gray-300 hover:border-pink-300'}`}>
                      🧁 Mini
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Donat (bertoping)</label>
                    <select value={batalForm.produk}
                      onChange={(e) => setBatalForm({ ...batalForm, produk: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-purple-500">
                      {DAFTAR_DONAT_TOPING.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                    <input type="number" min="1" value={batalForm.jumlah}
                      onChange={(e) => setBatalForm({ ...batalForm, jumlah: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-purple-500 text-lg font-bold"
                      placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                    <input type="text" value={batalForm.catatan}
                      onChange={(e) => setBatalForm({ ...batalForm, catatan: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="Contoh: Pelanggan tidak jadi ambil" />
                  </div>
                </div>
                <Button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white font-bold">
                  + Catat Batal Beli {batalForm.ukuran === 'mini' ? 'Mini' : 'Standar'}
                </Button>
              </form>

              <h4 className="text-sm font-bold text-gray-700 mb-2">Riwayat Batal Beli Hari Ini</h4>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ukuran</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Donat</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Jumlah</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batalRecords.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Belum ada pesanan batal hari ini 🎉</td></tr>
                  ) : (
                    <>
                      {batalRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(r.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                              {r.ukuran === 'mini' ? '🧁 Mini' : '🍩 Standar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.produk}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-purple-600">{r.jumlah} pcs</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{r.catatan || '-'}</td>
                        </tr>
                      ))}
                      <tr className="bg-purple-50">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                        <td></td>
                        <td></td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-purple-700">{totalBatalBeli} pcs</td>
                        <td className="px-4 py-3 text-xs text-gray-500">Standar: {totalBatalStandar} | Mini: {totalBatalMini}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
