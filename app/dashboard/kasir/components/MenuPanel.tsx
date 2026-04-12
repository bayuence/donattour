'use client';

import { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import type { ProductWithCategory, ProductPackage, ProductBundling, ProductCustomTemplate, Product, ProductCategory, ProductBox } from '@/lib/types';
import type { CartSatuanItem, ActiveSection } from '../hooks/useKasir';

interface JenisGroup extends ProductCategory {
  varian: ProductWithCategory[];
}

interface Props {
  activeSection: ActiveSection;
  isLoading: boolean;
  jenisGroups: JenisGroup[];
  paketList: ProductPackage[];
  bundlingList: ProductBundling[];
  customList: ProductCustomTemplate[];
  tambahanList: Product[];
  products: ProductWithCategory[];
  boxList: ProductBox[];
  // Cart helpers
  getCartQty: (varianId: string) => number;
  getCartSatuanId: (varianId: string) => string | null;
  getDisplayPrice: (p: ProductWithCategory) => number;
  formatRp: (n: number) => string;
  // Actions
  tambahSatuan: (p: ProductWithCategory) => void;
  updateQty: (id: string, delta: number) => void;
  bukaPaketModal: (p: ProductPackage) => void;
  tambahBundling: (b: ProductBundling) => void;
  tambahManualBox: (bx: ProductBox) => void;
  // Custom flow
  customStep: 'pilih-paket' | 'pilih-jenis' | 'pilih-rasa' | 'tambahan';
  setCustomStep: (s: any) => void;
  selectedCustomPaket: ProductCustomTemplate | null;
  setSelectedCustomPaket: (p: ProductCustomTemplate | null) => void;
  customJenisMode: string;
  setCustomJenisMode: (m: any) => void;
  customIsi: string[];
  setCustomIsi: (i: string[]) => void;
  customTambahan: { id: string; nama: string; qty: number; harga: number }[];
  setCustomTambahan: (t: any) => void;
  customTulisan: string;
  setCustomTulisan: (t: string) => void;
  konfirmasiCustom: () => void;
  activeColor: string;
}

const getActiveColorValues = (color: string) => {
  const map: Record<string, { bg: string, text: string, hoverText: string, hoverBorder: string, border: string, shadow: string, hoverBg: string }> = {
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', hoverText: 'hover:text-amber-600', hoverBorder: 'hover:border-amber-400', border: 'border-amber-200', shadow: 'shadow-amber-500/30', hoverBg: 'hover:bg-amber-500' },
    green: { bg: 'bg-green-500', text: 'text-green-600', hoverText: 'hover:text-green-600', hoverBorder: 'hover:border-green-400', border: 'border-green-200', shadow: 'shadow-green-500/30', hoverBg: 'hover:bg-green-500' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', hoverText: 'hover:text-orange-600', hoverBorder: 'hover:border-orange-400', border: 'border-orange-200', shadow: 'shadow-orange-500/30', hoverBg: 'hover:bg-orange-500' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', hoverText: 'hover:text-emerald-600', hoverBorder: 'hover:border-emerald-400', border: 'border-emerald-200', shadow: 'shadow-emerald-500/30', hoverBg: 'hover:bg-emerald-500' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', hoverText: 'hover:text-blue-600', hoverBorder: 'hover:border-blue-400', border: 'border-blue-200', shadow: 'shadow-blue-500/30', hoverBg: 'hover:bg-blue-500' },
  };
  return map[color] || map['amber'];
};

const getCategoryColor = (color: string) => {
  const map: Record<string, string> = {
    amber: 'text-amber-600', blue: 'text-blue-600', purple: 'text-purple-600',
    green: 'text-green-600', rose: 'text-rose-600', pink: 'text-pink-600',
    indigo: 'text-indigo-600', emerald: 'text-emerald-600',
  };
  return map[color] || 'text-slate-800';
};

const getCategoryLineColor = (color: string) => {
  const map: Record<string, string> = {
    amber: 'bg-amber-200', blue: 'bg-blue-200', purple: 'bg-purple-200',
    green: 'bg-green-200', rose: 'bg-rose-200', pink: 'bg-pink-200',
    indigo: 'bg-indigo-200', emerald: 'bg-emerald-200',
  };
  return map[color] || 'bg-slate-200';
};

export default function MenuPanel(props: Props) {
  const { activeSection, isLoading, jenisGroups, paketList, bundlingList, customList,
    tambahanList, products, boxList, getCartQty, getCartSatuanId, getDisplayPrice, formatRp,
    tambahSatuan, updateQty, bukaPaketModal, tambahBundling, tambahManualBox,
    customStep, setCustomStep, selectedCustomPaket, setSelectedCustomPaket,
    customJenisMode, setCustomJenisMode, customIsi, setCustomIsi,
    customTambahan, setCustomTambahan, customTulisan, setCustomTulisan, konfirmasiCustom, activeColor } = props;

  const [activeKategori, setActiveKategori] = useState<string>('all');

  const filteredGroups = activeKategori === 'all' 
    ? jenisGroups 
    : jenisGroups.filter(g => g.id === activeKategori);

  const colStyle = getActiveColorValues(activeColor);

  // ─── Logika Pengurutan & Flattening ──────────────────────────
  const displayVarian = useMemo(() => {
    if (activeKategori === 'all') {
      // Satukan semua dari tiap kategori
      const flattened = jenisGroups.flatMap(g => g.varian);
      // Urutkan: Termahal ke Termurah (High to Low)
      return flattened.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
    } else {
      // Hanya ambil varian dari kategori yang dipilih
      const targetGroup = jenisGroups.find(g => g.id === activeKategori);
      return targetGroup?.varian || [];
    }
  }, [activeKategori, jenisGroups, getDisplayPrice]);

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-6 no-scrollbar">
      {/* DONAT SECTION */}
      {activeSection === 'donat' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <Icons.Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-bold">Memuat Menu...</p>
            </div>
          ) : (
            <>
              {/* Filter Kategori */}
              {jenisGroups.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                  <button
                    onClick={() => setActiveKategori('all')}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                      activeKategori === 'all'
                        ? `${colStyle.bg} text-white ${colStyle.shadow}`
                        : `bg-white border-2 border-slate-100 text-slate-500 ${colStyle.hoverBorder} ${colStyle.hoverText}`
                    }`}
                  >
                    All Kategori
                  </button>
                  {jenisGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setActiveKategori(group.id)}
                      className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                        activeKategori === group.id
                          ? `${colStyle.bg} text-white ${colStyle.shadow}`
                          : `bg-white border-2 border-slate-100 text-slate-500 ${colStyle.hoverBorder} ${colStyle.hoverText}`
                      }`}
                    >
                      {group.nama}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid Produk Tunggal (Tanpa sekat kategori untuk All / Filter terpadu) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
                {displayVarian.map(v => {
                  const qty = getCartQty(v.id);
                  const price = getDisplayPrice(v);
                  return (
                    <div key={v.id} onClick={() => tambahSatuan(v)}
                      className={`group relative flex flex-col bg-white rounded-2xl p-2 md:p-2.5 border border-slate-100 ${colStyle.hoverBorder} hover:shadow-xl transition-all text-left overflow-hidden cursor-pointer active:scale-[0.97]`}>
                      <div className="aspect-square rounded-xl bg-slate-50 mb-2 overflow-hidden flex items-center justify-center">
                        {v.image_url ? <img src={v.image_url} alt={v.nama} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <Icons.Circle size={28} className="text-slate-200" />}
                      </div>
                      <h3 className="font-bold text-slate-800 text-[10px] md:text-xs line-clamp-2 leading-tight h-7 mb-0.5">{v.nama}</h3>
                      <p className={`${colStyle.text} font-black text-xs md:text-sm`}>{formatRp(price)}</p>
                      {qty > 0 && (
                        <div className="absolute top-1 right-1 flex items-center gap-1 p-0.5 bg-white/95 backdrop-blur rounded-full shadow-lg border">
                          <button onClick={(e) => { e.stopPropagation(); updateQty(getCartSatuanId(v.id)!, -1); }} className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-50 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors">
                            <Icons.Minus size={10} />
                          </button>
                          <span className="text-[9px] md:text-[10px] font-black w-2.5 md:w-3 text-center">{qty}</span>
                          <button onClick={(e) => { e.stopPropagation(); tambahSatuan(v); }} className={`w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-50 flex items-center justify-center ${colStyle.hoverBg} hover:text-white transition-colors`}>
                            <Icons.Plus size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* PAKET SECTION */}
      {activeSection === 'paket' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in">
          {paketList.map(pkt => (
            <button key={pkt.id} onClick={() => bukaPaketModal(pkt)}
              className="group relative bg-white p-4 md:p-5 rounded-3xl border border-slate-100 hover:border-amber-200 hover:shadow-2xl transition-all text-left overflow-hidden">
              <div className="relative z-10">
                <div className="p-2 w-10 h-10 rounded-xl bg-amber-50 text-amber-600 mb-2 group-hover:bg-amber-500 group-hover:text-white transition-all flex items-center justify-center">
                  <Icons.Package size={20} />
                </div>
                <h3 className="text-sm md:text-base font-black text-slate-800 mb-0.5 line-clamp-1">{pkt.nama}</h3>
                <p className="text-slate-400 text-[9px] md:text-[10px] mb-4 uppercase tracking-wider font-bold">Isi {pkt.kapasitas}</p>
                <span className="text-base font-black text-amber-600">{formatRp(pkt.harga_paket)}</span>
                <div className="w-full bg-slate-900 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest group-hover:bg-amber-600 transition-colors text-center mt-2">Atur Isi</div>
              </div>
              <Icons.Package size={80} className="absolute -bottom-6 -right-6 text-slate-50 group-hover:text-amber-50 transition-all" />
            </button>
          ))}
        </div>
      )}

      {/* BUNDLING */}
      {activeSection === 'bundling' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in">
          {bundlingList.map(b => (
            <button key={b.id} onClick={() => tambahBundling(b)}
              className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:shadow-2xl transition-all text-left">
              <div className="p-2 w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center">
                <Icons.Gift size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-800 mb-1">{b.nama}</h3>
              {b.harga_normal && <p className="text-xs text-slate-400 line-through">{formatRp(b.harga_normal)}</p>}
              <p className="text-lg font-black text-emerald-600">{formatRp(b.harga_bundling)}</p>
            </button>
          ))}
        </div>
      )}

      {/* CUSTOM SECTION */}
      {activeSection === 'custom' && (
        <div className="w-full bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40 animate-in fade-in">
          <div className="bg-slate-900 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icons.Palette className="text-amber-500" size={24} />
              <h2 className="text-white font-black text-lg">Custom Order Builder</h2>
            </div>
            <div className="flex gap-2">
              {['pilih-paket', 'pilih-jenis', 'pilih-rasa', 'tambahan'].map((s) => (
                <div key={s} className={`w-3 h-3 rounded-full ${customStep === s ? 'bg-amber-500' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {customStep === 'pilih-paket' && (
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-6">Langkah 1: Pilih Ukuran Box</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {customList.map(cp => (
                    <button key={cp.id} onClick={() => { setSelectedCustomPaket(cp); setCustomStep('pilih-jenis'); }}
                      className="p-5 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-amber-400 hover:bg-white transition-all text-left group">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 py-1 px-2 bg-amber-50 rounded-lg">{cp.ukuran_donat}</span>
                      <h4 className="text-lg font-black text-slate-800 mt-2">{cp.nama}</h4>
                      <p className="text-slate-400 text-xs mt-1">Isi {cp.kapasitas} pcs</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {customStep === 'pilih-jenis' && selectedCustomPaket && (
              <div>
                <button onClick={() => setCustomStep('pilih-paket')} className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-black tracking-widest mb-6 hover:text-slate-800">
                  <Icons.ArrowLeft size={14} /> Kembali
                </button>
                <h3 className="text-xl font-black text-slate-800 mb-6">Pilih Gaya Isian</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'campur', label: 'Mix & Match', desc: 'Bebas campur semua kategori', price: selectedCustomPaket.harga_satuan_default * selectedCustomPaket.kapasitas },
                    { id: 'klasik', label: 'Full Klasik', desc: 'Hanya varian klasik', price: selectedCustomPaket.harga_klasik_full },
                    { id: 'reguler', label: 'Full Reguler', desc: 'Hanya varian reguler', price: selectedCustomPaket.harga_reguler_full },
                    { id: 'premium', label: 'Full Premium', desc: 'Hanya varian premium', price: selectedCustomPaket.harga_premium_full },
                  ].map(m => (
                    <button key={m.id} disabled={!m.price} onClick={() => { setCustomJenisMode(m.id); setCustomIsi(Array(selectedCustomPaket.kapasitas).fill('')); setCustomStep('pilih-rasa'); }}
                      className={`flex justify-between items-center p-5 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-amber-400 transition-all text-left ${!m.price ? 'opacity-30' : ''}`}>
                      <div>
                        <h4 className="font-black text-slate-800">{m.label}</h4>
                        <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
                      </div>
                      <span className="text-lg font-black text-slate-900">{formatRp(m.price || 0)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {customStep === 'pilih-rasa' && selectedCustomPaket && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setCustomStep('pilih-jenis')} className="p-2 bg-slate-100 rounded-lg"><Icons.ArrowLeft size={16} /></button>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800">Isi Slot Donat</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400">{selectedCustomPaket.nama} • Mode {customJenisMode}</p>
                  </div>
                  <span className="text-lg font-black text-amber-600">{customIsi.filter(x => x).length} / {selectedCustomPaket.kapasitas}</span>
                </div>
                <div className="flex gap-6">
                  <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto max-h-[300px] pr-2">
                    {products.filter(v => v.tipe_produk === 'donat_varian' && (customJenisMode === 'campur' || v.category?.nama?.toLowerCase() === customJenisMode)).map(v => (
                      <button key={v.id} onClick={() => {
                        const next = customIsi.findIndex(x => !x);
                        if (next !== -1) { const n = [...customIsi]; n[next] = v.nama; setCustomIsi(n); }
                      }} className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:border-amber-400 hover:bg-amber-50 text-[10px] font-bold text-slate-700 text-center transition-all truncate">
                        {v.nama}
                      </button>
                    ))}
                  </div>
                  <div className="w-44 bg-slate-50 rounded-2xl p-4 self-start border">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-4 text-center">Isi Box</p>
                    <div className="grid grid-cols-3 gap-2">
                      {customIsi.map((v, i) => (
                        <button key={i} onClick={() => { if (v) { const n = [...customIsi]; n[i] = ''; setCustomIsi(n); } }}
                          className={`aspect-square rounded-lg border-2 flex items-center justify-center ${v ? 'bg-amber-400 border-amber-500 text-white' : 'bg-white border-slate-200'}`}>
                          {v ? <Icons.Check size={12} /> : <span className="text-[8px] text-slate-300">{i + 1}</span>}
                        </button>
                      ))}
                    </div>
                    <button disabled={customIsi.some(x => !x)} onClick={() => setCustomStep('tambahan')}
                      className="w-full mt-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-20 hover:bg-amber-600 transition-colors">
                      Berikutnya
                    </button>
                  </div>
                </div>
              </div>
            )}

            {customStep === 'tambahan' && selectedCustomPaket && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setCustomStep('pilih-rasa')} className="p-2 bg-slate-100 rounded-lg"><Icons.ArrowLeft size={16} /></button>
                  <h3 className="font-black text-slate-800">Finalisasi</h3>
                  <button onClick={konfirmasiCustom} className="ml-auto px-6 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">Selesaikan</button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Tambahan Topping</p>
                    <div className="space-y-2">
                      {tambahanList.map(t => {
                        const qty = customTambahan.find(x => x.id === t.id)?.qty || 0;
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{t.nama}</p>
                              <p className="text-[10px] text-amber-600 font-bold">{formatRp(t.harga_jual)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => {
                                const next = [...customTambahan]; const idx = next.findIndex(x => x.id === t.id);
                                if (idx !== -1) { if (next[idx].qty > 1) { next[idx].qty--; next[idx].harga = t.harga_jual * next[idx].qty; } else next.splice(idx, 1); setCustomTambahan(next); }
                              }} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold">−</button>
                              <span className="text-xs font-black w-4 text-center">{qty}</span>
                              <button onClick={() => {
                                const next = [...customTambahan]; const idx = next.findIndex(x => x.id === t.id);
                                if (idx === -1) next.push({ id: t.id, nama: t.nama, qty: 1, harga: t.harga_jual });
                                else { next[idx].qty++; next[idx].harga = t.harga_jual * next[idx].qty; }
                                setCustomTambahan(next);
                              }} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Pesan di Box</p>
                    <textarea value={customTulisan} onChange={(e) => setCustomTulisan(e.target.value)}
                      placeholder="Happy Birthday..."
                      className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs focus:border-amber-400 focus:outline-none placeholder:text-slate-300 font-medium" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOX / KEMASAN SECTION */}
      {activeSection === 'box' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {boxList.map(b => (
              <button
                key={b.id}
                onClick={() => tambahManualBox(b)}
                className="group relative h-full flex flex-col bg-white border-2 border-slate-100 rounded-3xl p-3 sm:p-4 text-left transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none"
              >
                <div className="w-10 h-10 mb-3 bg-slate-50 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-2xl flex items-center justify-center transition-colors">
                  <Icons.Package size={20} />
                </div>
                <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs leading-snug mb-1 line-clamp-2">{b.nama}</h4>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{b.kapasitas} pcs</span>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                    b.peruntukan === 'mini' ? 'bg-blue-50 text-blue-500' :
                    b.peruntukan === 'universal' ? 'bg-purple-50 text-purple-500' :
                    'bg-orange-50 text-orange-500'
                  }`}>
                    {b.peruntukan || 'standar'}
                  </span>
                </div>
                <div className="mt-auto pt-2 border-t border-slate-50">
                  <span className={`text-xs sm:text-sm font-black ${colStyle.text}`}>{formatRp(b.harga_box)}</span>
                </div>
              </button>
            ))}
            {boxList.length === 0 && (
              <p className="col-span-full text-center text-slate-400 py-10 font-medium text-sm">Tidak ada master box kemasan.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
