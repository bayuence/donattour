'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import type { Outlet } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Store, Users, Coffee, Receipt, MapPin, Phone, Settings2, Info } from 'lucide-react';
import MenuManagementTab from '@/components/outlet/MenuManagementTab';

type TabType = 'profil' | 'menu' | 'karyawan' | 'struk';

export default function KelolaOutletPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profil');
  const [loading, setLoading] = useState(true);
  
  // Profil States
  const [showProfilForm, setShowProfilForm] = useState(false);
  const [profilForm, setProfilForm] = useState({ nama: '', alamat: '', telepon: '', status: 'aktif' as 'aktif' | 'tutup' });

  // Struk States
  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const [isSavingStruk, setIsSavingStruk] = useState(false);
  const [previewStruk, setPreviewStruk] = useState({
    logo_url: '',
    show_logo: true,
    header_text: 'DONATTOUR',
    address_text: '',
    tax_info: '',
    footer_text: 'Terima kasih atas kunjungan Anda! Follow IG: @donattour',
    wifi_password: '',
    social_media: '',
  });

  const loadReceiptSettings = async (outlet: Outlet) => {
    // Reset preview seketika agar tidak bocor dari outlet sebelumnya
    setReceiptSettings(null);
    setPreviewStruk({
      logo_url: '',
      show_logo: true,
      header_text: 'DONATTOUR',
      address_text: outlet.alamat || '',
      tax_info: '',
      footer_text: 'Terima kasih atas kunjungan Anda! Follow IG: @donattour',
      wifi_password: '',
      social_media: '',
    });

    const settings = await db.getReceiptSettings(outlet.id);
    if (settings) {
      setReceiptSettings(settings);
      setPreviewStruk({
        logo_url: settings.logo_url ?? '',
        show_logo: settings.show_logo,
        header_text: settings.header_text ?? 'DONATTOUR',
        address_text: settings.address_text ?? outlet.alamat,
        tax_info: settings.tax_info ?? '',
        footer_text: settings.footer_text ?? 'Terima kasih atas kunjungan Anda! Follow IG: @donattour',
        wifi_password: settings.wifi_password ?? '',
        social_media: settings.social_media ?? '',
      });
    }
  };

  const updatePreviewFromForm = (formElement: HTMLFormElement) => {
    const formData = new FormData(formElement);
    setPreviewStruk(prev => ({
      ...prev,
      show_logo: formData.get('show_logo') === 'on',
      header_text: formData.get('header_text') as string,
      address_text: formData.get('address_text') as string,
      tax_info: formData.get('tax_info') as string,
      footer_text: formData.get('footer_text') as string,
      wifi_password: formData.get('wifi_password') as string,
      social_media: formData.get('social_media') as string,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewStruk(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewStruk(prev => ({ ...prev, logo_url: '' }));
    }
  };

  const handleUpdateStruk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOutlet) return;
    setIsSavingStruk(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      logo_url: previewStruk.logo_url,
      show_logo: formData.get('show_logo') === 'on',
      header_text: (formData.get('header_text') as string) || 'DONATTOUR',
      address_text: formData.get('address_text') as string,
      tax_info: formData.get('tax_info') as string,
      footer_text: formData.get('footer_text') as string,
      wifi_password: formData.get('wifi_password') as string,
      social_media: formData.get('social_media') as string,
    };
    const success = await db.updateReceiptSettings(selectedOutlet.id, updates as any);
    if (success) {
      alert('Pengaturan struk berhasil disimpan!');
      loadReceiptSettings(selectedOutlet);
    } else {
      alert('Gagal menyimpan pengaturan struk.');
    }
    setIsSavingStruk(false);
  };

  const load = async () => {
    setLoading(true);
    const data = await db.getOutlets();
    setOutlets(data);
    if (data.length > 0 && !selectedOutlet) {
      setSelectedOutlet(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedOutlet) {
      loadReceiptSettings(selectedOutlet);
    }
  }, [selectedOutlet]);

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilForm.nama || !profilForm.alamat) return;
    await db.createOutlet(profilForm);
    setProfilForm({ nama: '', alamat: '', telepon: '', status: 'aktif' });
    setShowProfilForm(false);
    load();
  };

  const handleUpdateOutlet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOutlet) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      nama: formData.get('nama') as string,
      alamat: formData.get('alamat') as string,
      telepon: formData.get('telepon') as string,
      status: formData.get('status') as 'aktif' | 'tutup'
    };
    const success = await db.updateOutlet(selectedOutlet.id, updates);
    if (success) {
      alert('Profil outlet berhasil diperbarui!');
      load();
    } else {
      alert('Gagal memperbarui profil outlet.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-colors text-sm";
  const labelClass = "block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider";

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      
      {/* ══════ SIDEBAR OUTLET LIST ══════ */}
      <div className="lg:w-1/3 xl:w-1/4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">🏪 Outlet Anda</h2>
          <Button 
            onClick={() => {
              setSelectedOutlet(null);
              setShowProfilForm(true);
            }} 
            size="sm" 
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
          >
            + Tambah
          </Button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
          {outlets.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setSelectedOutlet(o);
                setShowProfilForm(false);
                setActiveTab('profil');
              }}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedOutlet?.id === o.id 
                  ? 'border-orange-500 bg-orange-50 shadow-sm' 
                  : 'border-transparent bg-white shadow-sm hover:border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-gray-900">{o.nama}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${o.status === 'aktif' ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {o.alamat}
              </p>
            </button>
          ))}
          {outlets.length === 0 && (
            <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed">
              <Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Belum ada outlet terdaftar</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════ MAIN CONTENT AREA ══════ */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border overflow-hidden min-h-[600px] flex flex-col">
        
        {showProfilForm && !selectedOutlet ? (
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Tambah Outlet Baru</h3>
            <form onSubmit={handleCreateOutlet} className="space-y-5 max-w-xl">
              <div>
                <label className={labelClass}>Nama Outlet</label>
                <input type="text" autoFocus value={profilForm.nama} onChange={e => setProfilForm({...profilForm, nama: e.target.value})} className={inputClass} placeholder="Contoh: Cabang Sudirman" />
              </div>
              <div>
                <label className={labelClass}>Alamat Lengkap</label>
                <textarea value={profilForm.alamat} onChange={e => setProfilForm({...profilForm, alamat: e.target.value})} className={inputClass} rows={3} placeholder="Jalan Raya..." />
              </div>
              <div>
                <label className={labelClass}>No. Telepon / WhatsApp</label>
                <input type="tel" value={profilForm.telepon} onChange={e => setProfilForm({...profilForm, telepon: e.target.value})} className={inputClass} placeholder="08..." />
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" onClick={() => {setShowProfilForm(false); if(outlets.length>0) setSelectedOutlet(outlets[0]);}} variant="outline" className="flex-1 rounded-xl">Batal</Button>
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 rounded-xl text-white">Simpan Outlet</Button>
              </div>
            </form>
          </div>
        ) : selectedOutlet ? (
          <>
            {/* TABS HEADER */}
            <div className="flex border-b bg-gray-50/50 p-2 gap-2 overflow-x-auto">
              <button onClick={() => setActiveTab('profil')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'profil' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                <Settings2 className="w-4 h-4" /> Profil Outlet
              </button>
              <button onClick={() => setActiveTab('menu')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'menu' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                <Coffee className="w-4 h-4" /> Manajemen Menu
              </button>
              <button onClick={() => setActiveTab('karyawan')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'karyawan' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                <Users className="w-4 h-4" /> Karyawan
              </button>
              <button onClick={() => setActiveTab('struk')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'struk' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                <Receipt className="w-4 h-4" /> Pengaturan Struk
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-6 lg:p-8 overflow-y-auto">
              
              {/* --- TAB PROFIL --- */}
              {activeTab === 'profil' && (
                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Informasi Dasar</h3>
                      <p className="text-gray-500 text-sm">Sesuaikan detail profil untuk {selectedOutlet.nama}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${selectedOutlet.status === 'aktif' ? 'bg-green-100 text-green-700 border-green-200 border' : 'bg-red-100 text-red-700 border-red-200 border'}`}>
                      STATUS: {selectedOutlet.status.toUpperCase()}
                    </span>
                  </div>

                  <form onSubmit={handleUpdateOutlet} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Nama Outlet</label>
                        <input type="text" name="nama" defaultValue={selectedOutlet.nama} className={inputClass} required />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Alamat Lengkap</label>
                        <textarea name="alamat" defaultValue={selectedOutlet.alamat} className={inputClass} rows={3} required />
                      </div>
                      <div>
                        <label className={labelClass}>Nomor Telepon</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                          <input type="tel" name="telepon" defaultValue={selectedOutlet.telepon || ''} className={`${inputClass} pl-10`} placeholder="Kosong" />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Status Operasional</label>
                        <select name="status" defaultValue={selectedOutlet.status} className={inputClass}>
                          <option value="aktif">🟢 Buka / Aktif</option>
                          <option value="tutup">🔴 Tutup Sementara</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Jam Buka</label>
                        <input type="time" defaultValue="08:00" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Jam Tutup</label>
                        <input type="time" defaultValue="22:00" className={inputClass} />
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t flex justify-end">
                      <Button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8">Simpan Perubahan</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* --- TAB MENU --- */}
              {activeTab === 'menu' && (
                <MenuManagementTab outletId={selectedOutlet.id} />
              )}

              {/* --- TAB KARYAWAN --- */}
              {activeTab === 'karyawan' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Staf Bertugas</h3>
                      <p className="text-gray-500 text-sm">Kasir yang terdaftar di outlet {selectedOutlet.nama}.</p>
                    </div>
                    <Button onClick={() => window.location.href='/dashboard/kelola-karyawan'} className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl border border-blue-200">
                      Buka Kelola Karyawan (HR)
                    </Button>
                  </div>
                  
                  <KaryawanOutletList outletId={selectedOutlet.id} />
                </div>
              )}

              {/* --- TAB STRUK --- */}
              {activeTab === 'struk' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col md:flex-row gap-8">
                    <form onSubmit={handleUpdateStruk} className="flex-1 space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Pengaturan Struk Cetak</h3>
                        <p className="text-gray-500 text-sm">Sesuaikan tampilan struk pembeli untuk outlet ini.</p>
                      </div>
                      
                      <div>
                        <label className={labelClass}>Upload Logo Toko (Gambar Biasa)</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer" />
                        <p className="text-xs text-gray-400 mt-2">Pilih gambar logo dari komputer/HP Anda. {previewStruk.logo_url && <span className="text-green-500 font-bold">Logo sudah terpilih!</span>}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="show_logo" name="show_logo" checked={previewStruk.show_logo} onChange={e => {
                          const form = e.target.form;
                          if (form) updatePreviewFromForm(form);
                        }} className="w-4 h-4 text-orange-500" />
                        <label htmlFor="show_logo" className="text-sm font-bold text-gray-700">Tampilkan Logo di Struk</label>
                      </div>
                      <div>
                        <label className={labelClass}>Header Utama (Nama Toko)</label>
                        <input type="text" name="header_text" value={previewStruk.header_text} onChange={e => {
                          const form = e.target.form;
                          if (form) updatePreviewFromForm(form);
                        }} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Alamat di Struk</label>
                        <textarea name="address_text" value={previewStruk.address_text} onChange={e => {
                          const form = e.target.form;
                          if (form) updatePreviewFromForm(form);
                        }} className={inputClass} rows={2} />
                      </div>
                      <div>
                        <label className={labelClass}>Info Tambahan</label>
                        <input type="text" name="tax_info" value={previewStruk.tax_info} onChange={e => {
                          const form = e.target.form;
                          if (form) updatePreviewFromForm(form);
                        }} placeholder="Contoh: NPWP..." className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Pesan Footer</label>
                        <textarea name="footer_text" value={previewStruk.footer_text} onChange={e => {
                          const form = e.target.form;
                          if (form) updatePreviewFromForm(form);
                        }} className={inputClass} rows={2} />
                      </div>
                      
                      <Button type="submit" disabled={isSavingStruk} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl w-full">
                        {isSavingStruk ? 'Menyimpan...' : 'Simpan Format Struk'}
                      </Button>
                    </form>

                    {/* Simulasi Kertas Struk */}
                    <div className="w-full md:w-80 flex-shrink-0">
                      <div className="sticky top-6">
                        <label className={labelClass}>Preview Struk</label>
                        <div className="bg-gray-50 p-6 rounded-sm shadow-md border-t-8 border-gray-300 font-mono text-xs text-center flex flex-col items-center">
                          {previewStruk.show_logo && previewStruk.logo_url && (
                             <img src={previewStruk.logo_url} alt="Logo Struk" className="max-w-[120px] max-h-[80px] object-contain mb-3 grayscale contrast-125" />
                          )}
                          <p className="font-bold text-base mb-1">{previewStruk.header_text}</p>
                          <p className="text-gray-600 mb-2 whitespace-pre-wrap">{previewStruk.address_text}</p>
                          {previewStruk.tax_info && <p className="text-gray-500 mb-2">{previewStruk.tax_info}</p>}
                          
                          <div className="w-full border-t border-dashed border-gray-400 py-3 mb-3 text-left">
                            <p>TANGGAL : 04/04/2026 14:30:45</p>
                            <p>KASIR   : Budi</p>
                          </div>
                          <div className="w-full space-y-1 mb-3 text-left">
                            <div className="flex justify-between"><p>1x Donat Meses</p><p>5.000</p></div>
                            <div className="flex justify-between"><p>2x Donat Keju</p><p>10.000</p></div>
                          </div>
                          <div className="w-full border-t border-dashed border-gray-400 pt-3 flex justify-between font-bold text-sm mb-6">
                            <p>TOTAL</p>
                            <p>15.000</p>
                          </div>
                          <p className="text-gray-500 mb-2">{previewStruk.footer_text}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
            <Store className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">Pilih Outlet</h3>
            <p className="text-gray-400">Pilih outlet dari daftar di kiri untuk melihat dan mengelola detailnya.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KaryawanOutletList({ outletId }: { outletId: string }) {
  const [staf, setStaf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getStaf() {
      setLoading(true);
      const data = await db.getUsersDetailed(outletId);
      setStaf(data);
      setLoading(false);
    }
    getStaf();
  }, [outletId]);

  if (loading) return <div className="py-10 text-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  if (staf.length === 0) return (
    <div className="text-center py-10 bg-gray-50 border border-dashed rounded-xl">
      <p className="text-gray-500 text-sm">Belum ada staf yang ditugaskan di outlet ini.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {staf.map(s => (
        <div key={s.id} className={`flex items-center gap-4 p-4 rounded-xl border ${s.is_active ? 'bg-white' : 'bg-red-50/50 border-red-100'}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${s.is_active ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">{s.name}</p>
            <p className="text-xs text-gray-500">@{s.username}</p>
          </div>
          <div className="text-right">
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${s.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {s.is_active ? 'SIAP KERJA' : 'SUSPENDED'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
