'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type TabType = 'harga-dasar' | 'jenis' | 'varian' | 'box' | 'paket' | 'bundling' | 'custom' | 'tambahan';

// === INTERFACES ===

interface JenisDonat {
  id: string;
  nama: string;
  deskripsi: string;
  warna: string;
}

interface VarianDonat {
  id: string;
  nama: string;
  jenisId: string;
  gambar: string; // emoji atau URL gambar produk
  biayaTopping: number; // biaya topping per donat
  hargaJual: number; // harga jual ke customer
  ukuran: 'standar' | 'mini'; // ukuran donat
  status: 'aktif' | 'nonaktif';
}

interface BoxUkuran {
  id: string;
  nama: string; // Box Isi 1, Box Isi 3, Box Isi 6
  kapasitas: number; // 1, 3, 6
  hargaBox: number; // harga box-nya sendiri (bisa 0 kalau gratis)
}

interface PaketDonat {
  id: string;
  nama: string; // Paket Klasik Isi 3, Paket Premium Isi 6, dll
  jenisId: string; // jenis donat apa
  boxId: string; // box ukuran berapa
  hargaPaket: number; // harga diskon paket
  status: 'aktif' | 'nonaktif';
}

interface Bundling {
  id: string;
  nama: string; // Bundling Valentine, Bundling Hemat, dll
  deskripsi: string;
  piilhanItem: string; // deskripsi isi bundling
  hargaNormal: number;
  hargaBundling: number; // harga setelah diskon
  status: 'aktif' | 'nonaktif';
}

interface CustomPaket {
  id: string;
  nama: string; // Custom Isi 3, Custom Isi 6, Custom Isi 12
  kapasitas: number; // 3, 6, 12
  ukuranDonat: 'standar' | 'mini'; // standar=3/6, mini=12
  hargaSatuan: number; // harga per donat jika isi campur
  hargaKlasik: number; // harga paket jika semua klasik
  hargaReguler: number; // harga paket jika semua reguler
  hargaPremium: number; // harga paket jika semua premium
  status: 'aktif' | 'nonaktif';
}

interface TambahanItem {
  id: string;
  nama: string; // Keping Coklat, Pita, Lilin
  gambar: string; // emoji
  deskripsi: string;
  hargaJual: number;
  hargaModal: number; // HPP
  satuan: string; // 'keping', 'buah', 'batang'
  status: 'aktif' | 'nonaktif';
}

// === DEFAULT DATA ===

const defaultJenis: JenisDonat[] = [
  { id: 'jenis-1', nama: 'Klasik', deskripsi: 'Donat dengan topping dasar (gula, meses, dll)', warna: 'amber' },
  { id: 'jenis-2', nama: 'Reguler', deskripsi: 'Donat dengan topping standar (ceres, tiramisu, dll)', warna: 'blue' },
  { id: 'jenis-3', nama: 'Premium', deskripsi: 'Donat dengan topping premium (lotus, matcha, dll)', warna: 'purple' },
];

const defaultVarian: VarianDonat[] = [
  // Klasik — topping simple (gula, meses)
  { id: 'var-1', nama: 'Donat Gula', jenisId: 'jenis-1', gambar: '🍩', biayaTopping: 500, hargaJual: 3000, ukuran: 'standar', status: 'aktif' },
  { id: 'var-2', nama: 'Donat Meses', jenisId: 'jenis-1', gambar: '🟤', biayaTopping: 500, hargaJual: 3000, ukuran: 'standar', status: 'aktif' },
  { id: 'var-3', nama: 'Donat Gula Halus', jenisId: 'jenis-1', gambar: '⚪', biayaTopping: 500, hargaJual: 3000, ukuran: 'standar', status: 'aktif' },
  // Reguler — topping standar (ceres, tiramisu, dll)
  { id: 'var-4', nama: 'Donat Coklat Ceres', jenisId: 'jenis-2', gambar: '🍫', biayaTopping: 1500, hargaJual: 5000, ukuran: 'standar', status: 'aktif' },
  { id: 'var-5', nama: 'Donat Tiramisu', jenisId: 'jenis-2', gambar: '☕', biayaTopping: 1500, hargaJual: 5000, ukuran: 'standar', status: 'aktif' },
  { id: 'var-6', nama: 'Donat Strawberry', jenisId: 'jenis-2', gambar: '🍓', biayaTopping: 1500, hargaJual: 5000, ukuran: 'standar', status: 'aktif' },
  { id: 'var-7', nama: 'Donat Keju', jenisId: 'jenis-2', gambar: '🧀', biayaTopping: 1500, hargaJual: 5000, ukuran: 'standar', status: 'aktif' },
  // Premium — topping mahal (lotus, matcha, dll)
  { id: 'var-8', nama: 'Donat Vanila Lotus', jenisId: 'jenis-3', gambar: '🪷', biayaTopping: 3000, hargaJual: 8000, ukuran: 'standar', status: 'aktif' },
  { id: 'var-9', nama: 'Donat Matcha', jenisId: 'jenis-3', gambar: '🍵', biayaTopping: 3000, hargaJual: 8000, ukuran: 'standar', status: 'aktif' },
  { id: 'var-10', nama: 'Donat Red Velvet', jenisId: 'jenis-3', gambar: '❤️', biayaTopping: 3000, hargaJual: 8000, ukuran: 'standar', status: 'aktif' },
  // Mini — donat kecil
  { id: 'var-11', nama: 'Mini Gula', jenisId: 'jenis-1', gambar: '🔸', biayaTopping: 300, hargaJual: 1500, ukuran: 'mini', status: 'aktif' },
  { id: 'var-12', nama: 'Mini Meses', jenisId: 'jenis-1', gambar: '🔹', biayaTopping: 300, hargaJual: 1500, ukuran: 'mini', status: 'aktif' },
  { id: 'var-13', nama: 'Mini Coklat', jenisId: 'jenis-2', gambar: '🍬', biayaTopping: 800, hargaJual: 2500, ukuran: 'mini', status: 'aktif' },
  { id: 'var-14', nama: 'Mini Keju', jenisId: 'jenis-2', gambar: '🧁', biayaTopping: 800, hargaJual: 2500, ukuran: 'mini', status: 'aktif' },
  { id: 'var-15', nama: 'Mini Matcha', jenisId: 'jenis-3', gambar: '💚', biayaTopping: 1500, hargaJual: 4000, ukuran: 'mini', status: 'aktif' },
  { id: 'var-16', nama: 'Mini Red Velvet', jenisId: 'jenis-3', gambar: '💗', biayaTopping: 1500, hargaJual: 4000, ukuran: 'mini', status: 'aktif' },
];

const defaultBox: BoxUkuran[] = [
  { id: 'box-1', nama: 'Box Isi 1', kapasitas: 1, hargaBox: 0 },
  { id: 'box-2', nama: 'Box Isi 3', kapasitas: 3, hargaBox: 0 },
  { id: 'box-3', nama: 'Box Isi 6', kapasitas: 6, hargaBox: 0 },
];

const defaultPaket: PaketDonat[] = [
  { id: 'pkt-1', nama: 'Paket Klasik Isi 3', jenisId: 'jenis-1', boxId: 'box-2', hargaPaket: 8000, status: 'aktif' },
  { id: 'pkt-2', nama: 'Paket Klasik Isi 6', jenisId: 'jenis-1', boxId: 'box-3', hargaPaket: 15000, status: 'aktif' },
  { id: 'pkt-3', nama: 'Paket Reguler Isi 3', jenisId: 'jenis-2', boxId: 'box-2', hargaPaket: 13000, status: 'aktif' },
  { id: 'pkt-4', nama: 'Paket Reguler Isi 6', jenisId: 'jenis-2', boxId: 'box-3', hargaPaket: 25000, status: 'aktif' },
  { id: 'pkt-5', nama: 'Paket Premium Isi 3', jenisId: 'jenis-3', boxId: 'box-2', hargaPaket: 22000, status: 'aktif' },
  { id: 'pkt-6', nama: 'Paket Premium Isi 6', jenisId: 'jenis-3', boxId: 'box-3', hargaPaket: 42000, status: 'aktif' },
];

const defaultBundling: Bundling[] = [
  { id: 'bund-1', nama: 'Bundling Hemat A', deskripsi: 'Paket Klasik Isi 3 + 2 Donat Reguler', piilhanItem: '3 Donat Klasik + 2 Donat Reguler', hargaNormal: 18000, hargaBundling: 15000, status: 'aktif' },
  { id: 'bund-2', nama: 'Bundling Premium Mix', deskripsi: '6 Donat campuran Premium & Reguler', piilhanItem: '3 Donat Premium + 3 Donat Reguler', hargaNormal: 39000, hargaBundling: 33000, status: 'aktif' },
];

const defaultCustomPaket: CustomPaket[] = [
  { id: 'cust-1', nama: 'Custom Isi 3', kapasitas: 3, ukuranDonat: 'standar', hargaSatuan: 3000, hargaKlasik: 8000, hargaReguler: 13000, hargaPremium: 22000, status: 'aktif' },
  { id: 'cust-2', nama: 'Custom Isi 6', kapasitas: 6, ukuranDonat: 'standar', hargaSatuan: 3000, hargaKlasik: 15000, hargaReguler: 25000, hargaPremium: 42000, status: 'aktif' },
  { id: 'cust-3', nama: 'Custom Mini Isi 12', kapasitas: 12, ukuranDonat: 'mini', hargaSatuan: 1500, hargaKlasik: 15000, hargaReguler: 25000, hargaPremium: 42000, status: 'aktif' },
];

const defaultTambahan: TambahanItem[] = [
  { id: 'tmb-1', nama: 'Keping Coklat', gambar: '🍫', deskripsi: 'Keping coklat custom dengan tulisan (contoh: Selamat Menua)', hargaJual: 5000, hargaModal: 2000, satuan: 'keping', status: 'aktif' },
  { id: 'tmb-2', nama: 'Pita Hias', gambar: '🎀', deskripsi: 'Pita dekorasi untuk box donat custom', hargaJual: 3000, hargaModal: 1000, satuan: 'buah', status: 'aktif' },
  { id: 'tmb-3', nama: 'Lilin Angka', gambar: '🕯️', deskripsi: 'Lilin angka untuk ulang tahun', hargaJual: 5000, hargaModal: 2000, satuan: 'batang', status: 'aktif' },
  { id: 'tmb-4', nama: 'Lilin Kecil', gambar: '🎂', deskripsi: 'Lilin kecil warna-warni (isi 10)', hargaJual: 3000, hargaModal: 1000, satuan: 'pak', status: 'aktif' },
];

// === COMPONENT ===

export default function KelolaKasirPage() {
  const [activeTab, setActiveTab] = useState<TabType>('harga-dasar');

  // Data states
  const [jenisList, setJenisList] = useState(defaultJenis);
  const [varianList, setVarianList] = useState(defaultVarian);
  const [boxList, setBoxList] = useState(defaultBox);
  const [paketList, setPaketList] = useState(defaultPaket);
  const [bundlingList, setBundlingList] = useState(defaultBundling);
  const [customPaketList, setCustomPaketList] = useState(defaultCustomPaket);
  const [tambahanList, setTambahanList] = useState(defaultTambahan);
  const [hargaPolos, setHargaPolos] = useState(1500); // biaya produksi 1 donat polos standar
  const [hargaPolosMini, setHargaPolosMini] = useState(800); // biaya produksi 1 donat polos mini

  // Form visibility
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [jenisForm, setJenisForm] = useState({ nama: '', deskripsi: '', warna: 'amber' });
  const [varianForm, setVarianForm] = useState({ nama: '', jenisId: '', gambar: '', biayaTopping: '', hargaJual: '', ukuran: 'standar' as 'standar' | 'mini' });
  const [boxForm, setBoxForm] = useState({ nama: '', kapasitas: '', hargaBox: '' });
  const [paketForm, setPaketForm] = useState({ nama: '', jenisId: '', boxId: '', hargaPaket: '' });
  const [bundlingForm, setBundlingForm] = useState({ nama: '', deskripsi: '', piilhanItem: '', hargaNormal: '', hargaBundling: '' });
  const [customPaketForm, setCustomPaketForm] = useState({ nama: '', kapasitas: '', ukuranDonat: 'standar' as 'standar' | 'mini', hargaSatuan: '', hargaKlasik: '', hargaReguler: '', hargaPremium: '' });
  const [tambahanForm, setTambahanForm] = useState({ nama: '', gambar: '', deskripsi: '', hargaJual: '', hargaModal: '', satuan: 'buah' });

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);

  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
  const inputClass = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500 text-sm';
  const WARNA_OPTIONS = ['amber', 'blue', 'purple', 'green', 'red', 'pink'];

  const getJenisNama = (id: string) => jenisList.find((j) => j.id === id)?.nama || '-';
  const getJenisWarna = (id: string) => jenisList.find((j) => j.id === id)?.warna || 'gray';
  const getBoxNama = (id: string) => boxList.find((b) => b.id === id)?.nama || '-';
  const getBoxKapasitas = (id: string) => boxList.find((b) => b.id === id)?.kapasitas || 0;

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setJenisForm({ nama: '', deskripsi: '', warna: 'amber' });
    setVarianForm({ nama: '', jenisId: '', gambar: '', biayaTopping: '', hargaJual: '', ukuran: 'standar' });
    setBoxForm({ nama: '', kapasitas: '', hargaBox: '' });
    setPaketForm({ nama: '', jenisId: '', boxId: '', hargaPaket: '' });
    setBundlingForm({ nama: '', deskripsi: '', piilhanItem: '', hargaNormal: '', hargaBundling: '' });
    setCustomPaketForm({ nama: '', kapasitas: '', ukuranDonat: 'standar', hargaSatuan: '', hargaKlasik: '', hargaReguler: '', hargaPremium: '' });
    setTambahanForm({ nama: '', gambar: '', deskripsi: '', hargaJual: '', hargaModal: '', satuan: 'buah' });
  };

  // ═══ JENIS HANDLERS ═══
  const handleAddJenis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenisForm.nama) return;
    if (editingId) {
      setJenisList(jenisList.map((j) => j.id === editingId ? { ...j, ...jenisForm } : j));
    } else {
      setJenisList([...jenisList, { id: `jenis-${Date.now()}`, ...jenisForm }]);
    }
    resetForm();
  };

  // ═══ VARIAN HANDLERS ═══
  const handleAddVarian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varianForm.nama || !varianForm.jenisId || !varianForm.hargaJual) return;
    if (editingId) {
      setVarianList(varianList.map((v) => v.id === editingId ? { ...v, nama: varianForm.nama, jenisId: varianForm.jenisId, gambar: varianForm.gambar || '🍩', biayaTopping: Number(varianForm.biayaTopping || 0), hargaJual: Number(varianForm.hargaJual), ukuran: varianForm.ukuran } : v));
    } else {
      setVarianList([...varianList, { id: `var-${Date.now()}`, nama: varianForm.nama, jenisId: varianForm.jenisId, gambar: varianForm.gambar || '🍩', biayaTopping: Number(varianForm.biayaTopping || 0), hargaJual: Number(varianForm.hargaJual), ukuran: varianForm.ukuran, status: 'aktif' }]);
    }
    resetForm();
  };

  // ═══ BOX HANDLERS ═══
  const handleAddBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxForm.nama || !boxForm.kapasitas) return;
    if (editingId) {
      setBoxList(boxList.map((b) => b.id === editingId ? { ...b, nama: boxForm.nama, kapasitas: Number(boxForm.kapasitas), hargaBox: Number(boxForm.hargaBox || 0) } : b));
    } else {
      setBoxList([...boxList, { id: `box-${Date.now()}`, nama: boxForm.nama, kapasitas: Number(boxForm.kapasitas), hargaBox: Number(boxForm.hargaBox || 0) }]);
    }
    resetForm();
  };

  // ═══ PAKET HANDLERS ═══
  const handleAddPaket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paketForm.nama || !paketForm.jenisId || !paketForm.boxId || !paketForm.hargaPaket) return;
    if (editingId) {
      setPaketList(paketList.map((p) => p.id === editingId ? { ...p, nama: paketForm.nama, jenisId: paketForm.jenisId, boxId: paketForm.boxId, hargaPaket: Number(paketForm.hargaPaket) } : p));
    } else {
      setPaketList([...paketList, { id: `pkt-${Date.now()}`, nama: paketForm.nama, jenisId: paketForm.jenisId, boxId: paketForm.boxId, hargaPaket: Number(paketForm.hargaPaket), status: 'aktif' }]);
    }
    resetForm();
  };

  // ═══ BUNDLING HANDLERS ═══
  const handleAddBundling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundlingForm.nama || !bundlingForm.hargaBundling) return;
    if (editingId) {
      setBundlingList(bundlingList.map((b) => b.id === editingId ? { ...b, nama: bundlingForm.nama, deskripsi: bundlingForm.deskripsi, piilhanItem: bundlingForm.piilhanItem, hargaNormal: Number(bundlingForm.hargaNormal), hargaBundling: Number(bundlingForm.hargaBundling) } : b));
    } else {
      setBundlingList([...bundlingList, { id: `bund-${Date.now()}`, nama: bundlingForm.nama, deskripsi: bundlingForm.deskripsi, piilhanItem: bundlingForm.piilhanItem, hargaNormal: Number(bundlingForm.hargaNormal), hargaBundling: Number(bundlingForm.hargaBundling), status: 'aktif' }]);
    }
    resetForm();
  };

  // ═══ CUSTOM PAKET HANDLERS ═══
  const handleAddCustomPaket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPaketForm.nama || !customPaketForm.kapasitas) return;
    if (editingId) {
      setCustomPaketList(customPaketList.map((c) => c.id === editingId ? { ...c, nama: customPaketForm.nama, kapasitas: Number(customPaketForm.kapasitas), ukuranDonat: customPaketForm.ukuranDonat, hargaSatuan: Number(customPaketForm.hargaSatuan || 0), hargaKlasik: Number(customPaketForm.hargaKlasik || 0), hargaReguler: Number(customPaketForm.hargaReguler || 0), hargaPremium: Number(customPaketForm.hargaPremium || 0) } : c));
    } else {
      setCustomPaketList([...customPaketList, { id: `cust-${Date.now()}`, nama: customPaketForm.nama, kapasitas: Number(customPaketForm.kapasitas), ukuranDonat: customPaketForm.ukuranDonat, hargaSatuan: Number(customPaketForm.hargaSatuan || 0), hargaKlasik: Number(customPaketForm.hargaKlasik || 0), hargaReguler: Number(customPaketForm.hargaReguler || 0), hargaPremium: Number(customPaketForm.hargaPremium || 0), status: 'aktif' }]);
    }
    resetForm();
  };

  // ═══ TAMBAHAN HANDLERS ═══
  const handleAddTambahan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tambahanForm.nama || !tambahanForm.hargaJual) return;
    if (editingId) {
      setTambahanList(tambahanList.map((t) => t.id === editingId ? { ...t, nama: tambahanForm.nama, gambar: tambahanForm.gambar || '🎁', deskripsi: tambahanForm.deskripsi, hargaJual: Number(tambahanForm.hargaJual), hargaModal: Number(tambahanForm.hargaModal || 0), satuan: tambahanForm.satuan } : t));
    } else {
      setTambahanList([...tambahanList, { id: `tmb-${Date.now()}`, nama: tambahanForm.nama, gambar: tambahanForm.gambar || '🎁', deskripsi: tambahanForm.deskripsi, hargaJual: Number(tambahanForm.hargaJual), hargaModal: Number(tambahanForm.hargaModal || 0), satuan: tambahanForm.satuan, status: 'aktif' }]);
    }
    resetForm();
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'harga-dasar', label: '💰 Harga & Margin', count: varianList.filter((v) => v.status === 'aktif').length },
    { key: 'jenis', label: '🏷️ Jenis Donat', count: jenisList.length },
    { key: 'varian', label: '🍩 Varian Donat', count: varianList.length },
    { key: 'box', label: '📦 Box', count: boxList.length },
    { key: 'paket', label: '🎁 Paket', count: paketList.length },
    { key: 'bundling', label: '🔗 Bundling', count: bundlingList.length },
    { key: 'custom', label: '🎨 Custom', count: customPaketList.length },
    { key: 'tambahan', label: '✨ Tambahan', count: tambahanList.length },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🛒 Kelola Kasir</h2>
        <p className="text-sm text-gray-500">Kelola produk, harga dasar, margin keuntungan & tampilan kasir</p>
      </div>

      {/* ══════ Alur Pembelian ══════ */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">💡 Alur Pembelian di Kasir</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-600">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="font-bold text-green-700 mb-1">🛒 Beli Satuan / Campuran</p>
            <p>Pelanggan pilih donat bebas (mix jenis), harga per-pcs. Box sesuai jumlah.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-bold text-blue-700 mb-1">🎁 Beli Paket</p>
            <p>Pilih paket (jenis + isi berapa). Harga diskon. 1 jenis donat per paket.</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="font-bold text-purple-700 mb-1">🔗 Beli Bundling</p>
            <p>Kombinasi khusus dengan harga diskon spesial. Bisa campuran antar jenis.</p>
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
            <p className="font-bold text-pink-700 mb-1">🎨 Custom Order</p>
            <p>Isi 3/6 (standar) atau 12 (mini). Pilih rasa + tambahan (coklat, pita, lilin).</p>
          </div>
        </div>
      </div>

      {/* ══════ Summary ══════ */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); resetForm(); }}
            className={`rounded-xl p-4 text-left transition-all ${activeTab === t.key ? 'bg-amber-50 border-2 border-amber-400 shadow-sm' : 'bg-white border border-gray-200 hover:border-amber-200'}`}>
            <p className="text-xs text-gray-500">{t.label}</p>
            <p className={`text-xl font-bold ${activeTab === t.key ? 'text-amber-600' : 'text-gray-700'}`}>{t.count}</p>
          </button>
        ))}
      </div>

      {/* ══════ Tab Content ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); resetForm(); }}
              className={`whitespace-nowrap px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab.key ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ═══════════════ TAB: HARGA DASAR ═══════════════ */}
          {activeTab === 'harga-dasar' && (
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-gray-900">Harga Dasar & Margin Keuntungan</h3>
                <p className="text-xs text-gray-500">Atur biaya produksi donat polos & lihat margin keuntungan setiap varian</p>
              </div>

              {/* Harga Donat Polos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🍩</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">Donat Standar (Besar)</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Biaya produksi 1 donat polos standar</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm font-medium text-gray-600">Rp</span>
                        <input type="number" value={hargaPolos}
                          onChange={(e) => setHargaPolos(Number(e.target.value) || 0)}
                          className="w-36 px-4 py-2.5 border-2 border-amber-300 rounded-xl text-lg font-bold text-center focus:outline-none focus:border-amber-500 bg-white" />
                        <span className="text-xs text-gray-400">per donat</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🔸</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">Donat Mini (Kecil)</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Biaya produksi 1 donat polos mini</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm font-medium text-gray-600">Rp</span>
                        <input type="number" value={hargaPolosMini}
                          onChange={(e) => setHargaPolosMini(Number(e.target.value) || 0)}
                          className="w-36 px-4 py-2.5 border-2 border-pink-300 rounded-xl text-lg font-bold text-center focus:outline-none focus:border-pink-500 bg-white" />
                        <span className="text-xs text-gray-400">per donat</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rumus */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="text-xs font-bold text-gray-700 mb-2">💡 Rumus Perhitungan:</h4>
                <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">Donat Polos (Standar: {formatRp(hargaPolos)} / Mini: {formatRp(hargaPolosMini)})</span>
                  <span>+</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Biaya Topping</span>
                  <span>=</span>
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold">HPP (Harga Pokok)</span>
                  <span className="mx-1">→</span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Harga Jual − HPP = Margin</span>
                </div>
              </div>

              {/* Ringkasan per Jenis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {jenisList.map((jenis) => {
                  const variants = varianList.filter((v) => v.jenisId === jenis.id && v.status === 'aktif');
                  if (variants.length === 0) return null;
                  const avgHpp = variants.reduce((s, v) => s + (v.ukuran === 'mini' ? hargaPolosMini : hargaPolos) + v.biayaTopping, 0) / variants.length;
                  const avgJual = variants.reduce((s, v) => s + v.hargaJual, 0) / variants.length;
                  const avgMargin = avgJual - avgHpp;
                  return (
                    <div key={jenis.id} className="bg-white border rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">{jenis.nama}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Rata-rata HPP</span>
                          <span className="font-bold text-red-600">{formatRp(Math.round(avgHpp))}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Rata-rata Harga Jual</span>
                          <span className="font-bold text-amber-600">{formatRp(Math.round(avgJual))}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1.5 border-t">
                          <span className="text-gray-500">Rata-rata Margin</span>
                          <span className="font-bold text-green-600">{formatRp(Math.round(avgMargin))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabel detail */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-bold text-gray-600 text-xs">Varian</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 text-xs">Jenis</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-600 text-xs">Ukuran</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 text-xs">Donat Polos</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 text-xs">By. Topping</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 text-xs">HPP</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 text-xs">Harga Jual</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 text-xs">Margin</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 text-xs">Markup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varianList.filter((v) => v.status === 'aktif').map((v) => {
                      const basePrice = v.ukuran === 'mini' ? hargaPolosMini : hargaPolos;
                      const hpp = basePrice + v.biayaTopping;
                      const margin = v.hargaJual - hpp;
                      const markup = hpp > 0 ? Math.round((margin / hpp) * 100) : 0;
                      return (
                        <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{v.nama}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{getJenisNama(v.jenisId)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${v.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                              {v.ukuran === 'mini' ? 'Mini' : 'Standar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">{formatRp(basePrice)}</td>
                          <td className="px-4 py-3 text-right text-blue-600">{formatRp(v.biayaTopping)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">{formatRp(hpp)}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600">{formatRp(v.hargaJual)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{formatRp(margin)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${markup >= 50 ? 'bg-green-100 text-green-700' : markup >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {markup}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {varianList.filter((v) => v.status === 'aktif').length === 0 && (
                <p className="text-gray-400 text-center py-8">Belum ada varian aktif. Tambahkan di tab Varian Donat.</p>
              )}
            </div>
          )}

          {/* ═══════════════ TAB: JENIS DONAT ═══════════════ */}
          {activeTab === 'jenis' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Jenis Donat</h3>
                  <p className="text-xs text-gray-500">Kategori besar donat: Klasik, Reguler, Premium</p>
                </div>
                <Button onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {showForm ? 'Batal' : '+ Tambah Jenis'}
                </Button>
              </div>

              {showForm && (
                <form onSubmit={handleAddJenis} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nama Jenis</label>
                      <input type="text" value={jenisForm.nama} onChange={(e) => setJenisForm({ ...jenisForm, nama: e.target.value })}
                        className={inputClass} placeholder="Contoh: Premium" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                      <input type="text" value={jenisForm.deskripsi} onChange={(e) => setJenisForm({ ...jenisForm, deskripsi: e.target.value })}
                        className={inputClass} placeholder="Donat dengan topping premium" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Warna Badge</label>
                      <select value={jenisForm.warna} onChange={(e) => setJenisForm({ ...jenisForm, warna: e.target.value })} className={inputClass}>
                        {WARNA_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                    {editingId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {jenisList.map((jenis) => {
                  const varCount = varianList.filter((v) => v.jenisId === jenis.id).length;
                  const pktCount = paketList.filter((p) => p.jenisId === jenis.id).length;
                  const bgClass = `bg-${jenis.warna}-50 border-${jenis.warna}-200`;
                  const textClass = `text-${jenis.warna}-700`;
                  return (
                    <div key={jenis.id} className={`border-2 rounded-xl p-5 ${bgClass}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${textClass} bg-white/70 mb-2`}>
                            {jenis.nama}
                          </span>
                          <p className="text-sm text-gray-600">{jenis.deskripsi}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>🍩 {varCount} varian</span>
                        <span>🎁 {pktCount} paket</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setJenisForm({ nama: jenis.nama, deskripsi: jenis.deskripsi, warna: jenis.warna }); setEditingId(jenis.id); setShowForm(true); }}
                          className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => { setJenisList(jenisList.filter((j) => j.id !== jenis.id)); setVarianList(varianList.filter((v) => v.jenisId !== jenis.id)); setPaketList(paketList.filter((p) => p.jenisId !== jenis.id)); }}
                          className="text-xs text-red-600 hover:underline">Hapus</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════ TAB: VARIAN DONAT ═══════════════ */}
          {activeTab === 'varian' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Varian Donat</h3>
                  <p className="text-xs text-gray-500">Daftar semua donat beserta harga jual & margin, dikelompokkan per jenis</p>
                </div>
                <Button onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {showForm ? 'Batal' : '+ Tambah Varian'}
                </Button>
              </div>

              {showForm && (
                <form onSubmit={handleAddVarian} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gambar (emoji)</label>
                      <div className="flex items-center gap-2">
                        <input type="text" value={varianForm.gambar} onChange={(e) => setVarianForm({ ...varianForm, gambar: e.target.value })}
                          className={`${inputClass} text-center text-2xl`} placeholder="🍩" maxLength={4} />
                        {varianForm.gambar && <span className="text-3xl">{varianForm.gambar}</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nama Varian</label>
                      <input type="text" value={varianForm.nama} onChange={(e) => setVarianForm({ ...varianForm, nama: e.target.value })}
                        className={inputClass} placeholder="Donat Coklat Ceres" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Donat</label>
                      <select value={varianForm.jenisId} onChange={(e) => setVarianForm({ ...varianForm, jenisId: e.target.value })} className={inputClass}>
                        <option value="">-- Pilih Jenis --</option>
                        {jenisList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ukuran</label>
                      <select value={varianForm.ukuran} onChange={(e) => setVarianForm({ ...varianForm, ukuran: e.target.value as 'standar' | 'mini' })} className={inputClass}>
                        <option value="standar">Standar (Besar)</option>
                        <option value="mini">Mini (Kecil)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Biaya Topping (Rp)</label>
                      <input type="number" value={varianForm.biayaTopping} onChange={(e) => setVarianForm({ ...varianForm, biayaTopping: e.target.value })}
                        className={inputClass} placeholder="1500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Jual (Rp)</label>
                      <input type="number" value={varianForm.hargaJual} onChange={(e) => setVarianForm({ ...varianForm, hargaJual: e.target.value })}
                        className={inputClass} placeholder="5000" />
                    </div>
                  </div>
                  {varianForm.hargaJual && (() => {
                    const bp = varianForm.ukuran === 'mini' ? hargaPolosMini : hargaPolos;
                    const hppCalc = bp + Number(varianForm.biayaTopping || 0);
                    return (
                    <div className="flex gap-4 text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border">
                      <span>Ukuran: <b>{varianForm.ukuran === 'mini' ? 'Mini' : 'Standar'}</b></span>
                      <span>HPP: <b className="text-red-600">{formatRp(hppCalc)}</b></span>
                      <span>Margin: <b className="text-green-600">{formatRp(Number(varianForm.hargaJual) - hppCalc)}</b></span>
                      <span>Markup: <b>{hppCalc > 0 ? Math.round(((Number(varianForm.hargaJual) - hppCalc) / hppCalc) * 100) : 0}%</b></span>
                    </div>
                    );
                  })()}
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                    {editingId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              )}

              {jenisList.map((jenis) => {
                const variants = varianList.filter((v) => v.jenisId === jenis.id);
                if (variants.length === 0) return null;
                return (
                  <div key={jenis.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${jenis.warna}-100 text-${jenis.warna}-700`}>
                        {jenis.nama}
                      </span>
                      <span className="text-xs text-gray-400">{variants.length} varian</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {variants.map((v) => {
                      const basePrice = v.ukuran === 'mini' ? hargaPolosMini : hargaPolos;
                      const hpp = basePrice + v.biayaTopping;
                      const margin = v.hargaJual - hpp;
                      const markup = hpp > 0 ? Math.round((margin / hpp) * 100) : 0;
                      return (
                        <div key={v.id} className={`border rounded-lg p-4 ${v.status === 'nonaktif' ? 'opacity-50 bg-gray-50' : 'hover:shadow-sm'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <span className="text-3xl">{v.gambar || '🍩'}</span>
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{v.nama}</h4>
                                <div className="flex gap-1.5 mt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${v.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {v.ukuran === 'mini' ? 'Mini' : 'Standar'}
                                  </span>
                                </div>
                                <p className="text-lg font-bold text-amber-600 mt-1">{formatRp(v.hargaJual)}<span className="text-xs text-gray-400 font-normal"> /pcs</span></p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {v.status}
                            </span>
                          </div>
                          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">HPP: Polos {formatRp(basePrice)} + Topping {formatRp(v.biayaTopping)}</span>
                              <span className="font-bold text-red-600">{formatRp(hpp)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Margin</span>
                              <span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRp(margin)} ({markup}%)</span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => { setVarianForm({ nama: v.nama, jenisId: v.jenisId, gambar: v.gambar, biayaTopping: String(v.biayaTopping), hargaJual: String(v.hargaJual), ukuran: v.ukuran }); setEditingId(v.id); setShowForm(true); }}
                              className="text-xs text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => setVarianList(varianList.map((x) => x.id === v.id ? { ...x, status: x.status === 'aktif' ? 'nonaktif' : 'aktif' } : x))}
                              className="text-xs text-yellow-600 hover:underline">{v.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                            <button onClick={() => setVarianList(varianList.filter((x) => x.id !== v.id))}
                              className="text-xs text-red-600 hover:underline">Hapus</button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })}
              {varianList.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada varian donat</p>}
            </div>
          )}

          {/* ═══════════════ TAB: BOX ═══════════════ */}
          {activeTab === 'box' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Ukuran Box</h3>
                  <p className="text-xs text-gray-500">Jenis box yang tersedia di outlet (isi 1, 3, 6, dll)</p>
                </div>
                <Button onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {showForm ? 'Batal' : '+ Tambah Box'}
                </Button>
              </div>

              {showForm && (
                <form onSubmit={handleAddBox} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nama Box</label>
                      <input type="text" value={boxForm.nama} onChange={(e) => setBoxForm({ ...boxForm, nama: e.target.value })}
                        className={inputClass} placeholder="Box Isi 12" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kapasitas (pcs)</label>
                      <input type="number" min="1" value={boxForm.kapasitas} onChange={(e) => setBoxForm({ ...boxForm, kapasitas: e.target.value })}
                        className={inputClass} placeholder="6" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Box (Rp, 0 jika gratis)</label>
                      <input type="number" value={boxForm.hargaBox} onChange={(e) => setBoxForm({ ...boxForm, hargaBox: e.target.value })}
                        className={inputClass} placeholder="0" />
                    </div>
                  </div>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                    {editingId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {boxList.map((box) => {
                  const pktCount = paketList.filter((p) => p.boxId === box.id).length;
                  return (
                    <div key={box.id} className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-amber-300 transition-colors">
                      <div className="text-4xl mb-2">📦</div>
                      <h4 className="font-bold text-gray-900 text-lg">{box.nama}</h4>
                      <p className="text-3xl font-bold text-amber-600 mt-1">{box.kapasitas} <span className="text-sm text-gray-400">pcs</span></p>
                      {box.hargaBox > 0 && <p className="text-sm text-gray-500 mt-1">Harga box: {formatRp(box.hargaBox)}</p>}
                      {box.hargaBox === 0 && <p className="text-sm text-green-600 mt-1">Box gratis</p>}
                      <p className="text-xs text-gray-400 mt-2">Dipakai di {pktCount} paket</p>
                      <div className="flex justify-center gap-3 mt-3">
                        <button onClick={() => { setBoxForm({ nama: box.nama, kapasitas: String(box.kapasitas), hargaBox: String(box.hargaBox) }); setEditingId(box.id); setShowForm(true); }}
                          className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => { setBoxList(boxList.filter((b) => b.id !== box.id)); setPaketList(paketList.filter((p) => p.boxId !== box.id)); }}
                          className="text-xs text-red-600 hover:underline">Hapus</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════ TAB: PAKET ═══════════════ */}
          {activeTab === 'paket' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Paket Donat</h3>
                  <p className="text-xs text-gray-500">Paket diskon: pilih jenis donat + isi berapa. Kasir tinggal tanya isinya apa aja</p>
                </div>
                <Button onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {showForm ? 'Batal' : '+ Tambah Paket'}
                </Button>
              </div>

              {showForm && (
                <form onSubmit={handleAddPaket} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nama Paket</label>
                      <input type="text" value={paketForm.nama} onChange={(e) => setPaketForm({ ...paketForm, nama: e.target.value })}
                        className={inputClass} placeholder="Paket Reguler Isi 3" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Donat</label>
                      <select value={paketForm.jenisId} onChange={(e) => setPaketForm({ ...paketForm, jenisId: e.target.value })} className={inputClass}>
                        <option value="">-- Pilih Jenis --</option>
                        {jenisList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Box (isi berapa)</label>
                      <select value={paketForm.boxId} onChange={(e) => setPaketForm({ ...paketForm, boxId: e.target.value })} className={inputClass}>
                        <option value="">-- Pilih Box --</option>
                        {boxList.map((b) => <option key={b.id} value={b.id}>{b.nama} ({b.kapasitas} pcs)</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Paket (diskon, Rp)</label>
                      <input type="number" value={paketForm.hargaPaket} onChange={(e) => setPaketForm({ ...paketForm, hargaPaket: e.target.value })}
                        className={inputClass} placeholder="25000" />
                    </div>
                  </div>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                    {editingId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              )}

              {/* Grouped by Jenis */}
              {jenisList.map((jenis) => {
                const pakets = paketList.filter((p) => p.jenisId === jenis.id);
                if (pakets.length === 0) return null;
                // ambil harga satuan rata-rata untuk perbandingan
                const avgHarga = varianList.filter((v) => v.jenisId === jenis.id).reduce((s, v) => s + v.hargaJual, 0) / (varianList.filter((v) => v.jenisId === jenis.id).length || 1);
                return (
                  <div key={jenis.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${jenis.warna}-100 text-${jenis.warna}-700`}>
                        🎁 Paket {jenis.nama}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pakets.map((pkt) => {
                        const kap = getBoxKapasitas(pkt.boxId);
                        const hargaNormalTotal = avgHarga * kap;
                        const hemat = hargaNormalTotal - pkt.hargaPaket;
                        return (
                          <div key={pkt.id} className={`border rounded-xl p-5 ${pkt.status === 'nonaktif' ? 'opacity-50 bg-gray-50' : 'hover:shadow-md transition-shadow'}`}>
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-gray-900">{pkt.nama}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pkt.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {pkt.status}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-500">📦 {getBoxNama(pkt.boxId)} ({kap} pcs)</p>
                              <p className="text-xs text-gray-400 line-through">Normal: ~{formatRp(hargaNormalTotal)}</p>
                              <p className="text-xl font-bold text-green-600">{formatRp(pkt.hargaPaket)}</p>
                              {hemat > 0 && <p className="text-xs text-green-600 font-bold">Hemat {formatRp(hemat)}!</p>}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => { setPaketForm({ nama: pkt.nama, jenisId: pkt.jenisId, boxId: pkt.boxId, hargaPaket: String(pkt.hargaPaket) }); setEditingId(pkt.id); setShowForm(true); }}
                                className="text-xs text-blue-600 hover:underline">Edit</button>
                              <button onClick={() => setPaketList(paketList.map((x) => x.id === pkt.id ? { ...x, status: x.status === 'aktif' ? 'nonaktif' : 'aktif' } : x))}
                                className="text-xs text-yellow-600 hover:underline">{pkt.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                              <button onClick={() => setPaketList(paketList.filter((x) => x.id !== pkt.id))}
                                className="text-xs text-red-600 hover:underline">Hapus</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {paketList.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada paket</p>}
            </div>
          )}

          {/* ═══════════════ TAB: BUNDLING ═══════════════ */}
          {activeTab === 'bundling' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Bundling Spesial</h3>
                  <p className="text-xs text-gray-500">Kombinasi produk khusus dengan harga diskon spesial</p>
                </div>
                <Button onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {showForm ? 'Batal' : '+ Tambah Bundling'}
                </Button>
              </div>

              {showForm && (
                <form onSubmit={handleAddBundling} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nama Bundling</label>
                      <input type="text" value={bundlingForm.nama} onChange={(e) => setBundlingForm({ ...bundlingForm, nama: e.target.value })}
                        className={inputClass} placeholder="Bundling Hemat Weekend" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                      <input type="text" value={bundlingForm.deskripsi} onChange={(e) => setBundlingForm({ ...bundlingForm, deskripsi: e.target.value })}
                        className={inputClass} placeholder="Cocok untuk keluarga" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Isi Bundling</label>
                    <input type="text" value={bundlingForm.piilhanItem} onChange={(e) => setBundlingForm({ ...bundlingForm, piilhanItem: e.target.value })}
                      className={inputClass} placeholder="Contoh: 3 Donat Klasik + 3 Donat Reguler + 2 Donat Premium" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Normal (Rp)</label>
                      <input type="number" value={bundlingForm.hargaNormal} onChange={(e) => setBundlingForm({ ...bundlingForm, hargaNormal: e.target.value })}
                        className={inputClass} placeholder="50000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Bundling (Rp)</label>
                      <input type="number" value={bundlingForm.hargaBundling} onChange={(e) => setBundlingForm({ ...bundlingForm, hargaBundling: e.target.value })}
                        className={inputClass} placeholder="40000" />
                    </div>
                  </div>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                    {editingId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundlingList.map((bund) => {
                  const hemat = bund.hargaNormal - bund.hargaBundling;
                  const diskonPersen = bund.hargaNormal > 0 ? Math.round((hemat / bund.hargaNormal) * 100) : 0;
                  return (
                    <div key={bund.id} className={`border rounded-xl p-5 ${bund.status === 'nonaktif' ? 'opacity-50 bg-gray-50' : 'hover:shadow-md transition-shadow'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900">{bund.nama}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{bund.deskripsi}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          {diskonPersen > 0 && (
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">-{diskonPersen}%</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${bund.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {bund.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-700">📋 Isi: {bund.piilhanItem}</p>
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <div>
                          <p className="text-xs text-gray-400 line-through">{formatRp(bund.hargaNormal)}</p>
                          <p className="text-xl font-bold text-green-600">{formatRp(bund.hargaBundling)}</p>
                        </div>
                        {hemat > 0 && <p className="text-xs text-green-600 font-bold mb-1">Hemat {formatRp(hemat)}</p>}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setBundlingForm({ nama: bund.nama, deskripsi: bund.deskripsi, piilhanItem: bund.piilhanItem, hargaNormal: String(bund.hargaNormal), hargaBundling: String(bund.hargaBundling) }); setEditingId(bund.id); setShowForm(true); }}
                          className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => setBundlingList(bundlingList.map((x) => x.id === bund.id ? { ...x, status: x.status === 'aktif' ? 'nonaktif' : 'aktif' } : x))}
                          className="text-xs text-yellow-600 hover:underline">{bund.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        <button onClick={() => setBundlingList(bundlingList.filter((x) => x.id !== bund.id))}
                          className="text-xs text-red-600 hover:underline">Hapus</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {bundlingList.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada bundling</p>}
            </div>
          )}

          {/* ═══════════════ TAB: CUSTOM PAKET ═══════════════ */}
          {activeTab === 'custom' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Custom Order</h3>
                  <p className="text-xs text-gray-500">Atur paket custom: isi 3/6 (standar) atau isi 12 (mini). Pelanggan pilih rasa & tambahan</p>
                </div>
                <Button onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {showForm ? 'Batal' : '+ Tambah Custom'}
                </Button>
              </div>

              {/* Info */}
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-bold text-pink-700 mb-2">🎨 Cara Kerja Custom Order:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
                  <div>
                    <p className="font-bold text-gray-700 mb-1">1. Pilih kapasitas</p>
                    <p>Isi 3 (standar) / Isi 6 (standar) / Isi 12 (mini — otomatis donat kecil)</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-1">2. Pilih jenis isian</p>
                    <p>Satuan (campur) / Semua Klasik / Semua Reguler / Semua Premium → harga berbeda</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-1">3. Pilih rasa donat</p>
                    <p>Pelanggan memilih rasa sesuai jenis yang dipilih</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-1">4. Tambahan (opsional)</p>
                    <p>Keping coklat + tulisan, pita hias, lilin. Harga tambahan terpisah</p>
                  </div>
                </div>
              </div>

              {showForm && (
                <form onSubmit={handleAddCustomPaket} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nama Custom</label>
                      <input type="text" value={customPaketForm.nama} onChange={(e) => setCustomPaketForm({ ...customPaketForm, nama: e.target.value })}
                        className={inputClass} placeholder="Custom Isi 3" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kapasitas (pcs)</label>
                      <input type="number" value={customPaketForm.kapasitas} onChange={(e) => {
                        const kap = Number(e.target.value);
                        setCustomPaketForm({ ...customPaketForm, kapasitas: e.target.value, ukuranDonat: kap >= 12 ? 'mini' : 'standar' });
                      }}
                        className={inputClass} placeholder="3, 6, atau 12" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ukuran Donat</label>
                      <select value={customPaketForm.ukuranDonat} onChange={(e) => setCustomPaketForm({ ...customPaketForm, ukuranDonat: e.target.value as 'standar' | 'mini' })} className={inputClass}>
                        <option value="standar">Standar (Besar)</option>
                        <option value="mini">Mini (Kecil)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Satuan/Campur (Rp)</label>
                      <input type="number" value={customPaketForm.hargaSatuan} onChange={(e) => setCustomPaketForm({ ...customPaketForm, hargaSatuan: e.target.value })}
                        className={inputClass} placeholder="3000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Paket Klasik (Rp)</label>
                      <input type="number" value={customPaketForm.hargaKlasik} onChange={(e) => setCustomPaketForm({ ...customPaketForm, hargaKlasik: e.target.value })}
                        className={inputClass} placeholder="8000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Paket Reguler (Rp)</label>
                      <input type="number" value={customPaketForm.hargaReguler} onChange={(e) => setCustomPaketForm({ ...customPaketForm, hargaReguler: e.target.value })}
                        className={inputClass} placeholder="13000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Paket Premium (Rp)</label>
                      <input type="number" value={customPaketForm.hargaPremium} onChange={(e) => setCustomPaketForm({ ...customPaketForm, hargaPremium: e.target.value })}
                        className={inputClass} placeholder="22000" />
                    </div>
                  </div>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                    {editingId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {customPaketList.map((cp) => (
                  <div key={cp.id} className={`border-2 rounded-xl p-5 ${cp.status === 'nonaktif' ? 'opacity-50 bg-gray-50' : 'hover:shadow-md transition-shadow'} ${cp.ukuranDonat === 'mini' ? 'border-pink-200' : 'border-amber-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{cp.nama}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${cp.ukuranDonat === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                            {cp.ukuranDonat === 'mini' ? '🔸 Mini' : '🍩 Standar'}
                          </span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                            {cp.kapasitas} pcs
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cp.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {cp.status}
                      </span>
                    </div>
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Campur / Satuan</span>
                        <span className="font-bold text-gray-700">{formatRp(cp.hargaSatuan)} /pcs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-600">Semua Klasik</span>
                        <span className="font-bold text-amber-700">{formatRp(cp.hargaKlasik)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Semua Reguler</span>
                        <span className="font-bold text-blue-700">{formatRp(cp.hargaReguler)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-600">Semua Premium</span>
                        <span className="font-bold text-purple-700">{formatRp(cp.hargaPremium)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setCustomPaketForm({ nama: cp.nama, kapasitas: String(cp.kapasitas), ukuranDonat: cp.ukuranDonat, hargaSatuan: String(cp.hargaSatuan), hargaKlasik: String(cp.hargaKlasik), hargaReguler: String(cp.hargaReguler), hargaPremium: String(cp.hargaPremium) }); setEditingId(cp.id); setShowForm(true); }}
                        className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => setCustomPaketList(customPaketList.map((x) => x.id === cp.id ? { ...x, status: x.status === 'aktif' ? 'nonaktif' : 'aktif' } : x))}
                        className="text-xs text-yellow-600 hover:underline">{cp.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      <button onClick={() => setCustomPaketList(customPaketList.filter((x) => x.id !== cp.id))}
                        className="text-xs text-red-600 hover:underline">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
              {customPaketList.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada paket custom</p>}
            </div>
          )}

          {/* ═══════════════ TAB: TAMBAHAN ═══════════════ */}
          {activeTab === 'tambahan' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Item Tambahan Custom</h3>
                  <p className="text-xs text-gray-500">Keping coklat (dengan tulisan), pita hias, lilin — untuk pesanan custom</p>
                </div>
                <Button onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {showForm ? 'Batal' : '+ Tambah Item'}
                </Button>
              </div>

              {showForm && (
                <form onSubmit={handleAddTambahan} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gambar (emoji)</label>
                      <input type="text" value={tambahanForm.gambar} onChange={(e) => setTambahanForm({ ...tambahanForm, gambar: e.target.value })}
                        className={`${inputClass} text-center text-2xl`} placeholder="🍫" maxLength={4} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nama Item</label>
                      <input type="text" value={tambahanForm.nama} onChange={(e) => setTambahanForm({ ...tambahanForm, nama: e.target.value })}
                        className={inputClass} placeholder="Keping Coklat" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                      <select value={tambahanForm.satuan} onChange={(e) => setTambahanForm({ ...tambahanForm, satuan: e.target.value })} className={inputClass}>
                        <option value="keping">Keping</option>
                        <option value="buah">Buah</option>
                        <option value="batang">Batang</option>
                        <option value="pak">Pak</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                    <input type="text" value={tambahanForm.deskripsi} onChange={(e) => setTambahanForm({ ...tambahanForm, deskripsi: e.target.value })}
                      className={inputClass} placeholder="Keping coklat custom dengan tulisan" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Modal / HPP (Rp)</label>
                      <input type="number" value={tambahanForm.hargaModal} onChange={(e) => setTambahanForm({ ...tambahanForm, hargaModal: e.target.value })}
                        className={inputClass} placeholder="2000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Harga Jual (Rp)</label>
                      <input type="number" value={tambahanForm.hargaJual} onChange={(e) => setTambahanForm({ ...tambahanForm, hargaJual: e.target.value })}
                        className={inputClass} placeholder="5000" />
                    </div>
                  </div>
                  {tambahanForm.hargaJual && tambahanForm.hargaModal && (
                    <div className="flex gap-4 text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border">
                      <span>Margin: <b className="text-green-600">{formatRp(Number(tambahanForm.hargaJual) - Number(tambahanForm.hargaModal))}</b></span>
                      <span>Markup: <b>{Number(tambahanForm.hargaModal) > 0 ? Math.round(((Number(tambahanForm.hargaJual) - Number(tambahanForm.hargaModal)) / Number(tambahanForm.hargaModal)) * 100) : 0}%</b></span>
                    </div>
                  )}
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                    {editingId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tambahanList.map((item) => {
                  const margin = item.hargaJual - item.hargaModal;
                  return (
                    <div key={item.id} className={`border rounded-xl p-5 text-center ${item.status === 'nonaktif' ? 'opacity-50 bg-gray-50' : 'hover:shadow-md transition-shadow'}`}>
                      <div className="text-4xl mb-2">{item.gambar}</div>
                      <h4 className="font-bold text-gray-900">{item.nama}</h4>
                      <p className="text-xs text-gray-500 mt-1">{item.deskripsi}</p>
                      <p className="text-xl font-bold text-amber-600 mt-2">{formatRp(item.hargaJual)}<span className="text-xs text-gray-400 font-normal"> /{item.satuan}</span></p>
                      <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Modal</span>
                          <span className="text-red-600 font-bold">{formatRp(item.hargaModal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Margin</span>
                          <span className="text-green-600 font-bold">{formatRp(margin)}</span>
                        </div>
                      </div>
                      <div className="flex justify-center gap-3 mt-3">
                        <button onClick={() => { setTambahanForm({ nama: item.nama, gambar: item.gambar, deskripsi: item.deskripsi, hargaJual: String(item.hargaJual), hargaModal: String(item.hargaModal), satuan: item.satuan }); setEditingId(item.id); setShowForm(true); }}
                          className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => setTambahanList(tambahanList.map((x) => x.id === item.id ? { ...x, status: x.status === 'aktif' ? 'nonaktif' : 'aktif' } : x))}
                          className="text-xs text-yellow-600 hover:underline">{item.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        <button onClick={() => setTambahanList(tambahanList.filter((x) => x.id !== item.id))}
                          className="text-xs text-red-600 hover:underline">Hapus</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {tambahanList.length === 0 && <p className="text-gray-400 text-center py-8">Belum ada item tambahan</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
