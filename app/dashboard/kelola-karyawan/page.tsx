'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import type { UserWithProfile, Outlet, UserRole, EmployeeProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Users, Search, Store, Lock, KeyRound, Building, Phone, CalendarDays, WalletCards, ShieldAlert, BadgeCheck } from 'lucide-react';

export default function KelolaKaryawanPage() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  
  const loadData = async () => {
    setLoading(true);
    const [fetchedUsers, fetchedOutlets] = await Promise.all([
      db.getUsersDetailed(),
      db.getOutlets()
    ]);
    setUsers(fetchedUsers);
    setOutlets(fetchedOutlets);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenEdit = (user: UserWithProfile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-500" />
            Kelola Karyawan (HR)
          </h2>
          <p className="text-sm text-gray-500 mt-1">Sistem pusat manajemen staf, kasir, dan penugasan lokasi kerja.</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama karyawan..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
          <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
            + Tambah Staf Baru
          </Button>
        </div>
      </div>

      {/* DATA GRID */}
      {loading ? (
        <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b">
                <tr>
                  <th className="px-6 py-4">Informasi Pegawai</th>
                  <th className="px-6 py-4">Akses & Posisi</th>
                  <th className="px-6 py-4">Penugasan Outlet</th>
                  <th className="px-6 py-4">Status & Login</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                      Tidak ada data staf ditemukan.
                    </td>
                  </tr>
                ) : filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                        u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        u.role === 'cashier' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-400 mt-1 capitalize">{u.profile?.employment_type?.replace('_', ' ') || 'Belum di-set'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {u.outlet ? (
                        <div className="flex items-center gap-1.5 text-orange-700 font-semibold bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100 inline-flex w-max">
                          <Store className="w-3 h-3" /> {u.outlet.nama}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Belum ditugaskan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`flex items-center gap-1 text-xs font-bold ${u.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.is_active ? 'AKTIF' : 'SUSPENDED'}
                        </span>
                        <p className="text-[11px] text-gray-400">
                          Login: {u.last_login ? new Date(u.last_login).toLocaleDateString('id-ID') : 'Belum pernah'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)} className="rounded-lg shadow-sm border-gray-200 text-gray-700">
                        Kelola Profil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL KELOLA KARYAWAN */}
      {isModalOpen && (
        <EmployeeModal 
          user={selectedUser} 
          outlets={outlets} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => { setIsModalOpen(false); loadData(); }} 
        />
      )}

    </div>
  );
}

function EmployeeModal({ user, outlets, onClose, onSuccess }: { user: UserWithProfile | null, outlets: Outlet[], onClose: () => void, onSuccess: () => void }) {
  const isEdit = !!user;
  const [activeTab, setActiveTab] = useState<'akses' | 'hr' | 'menu'>('akses');
  const [isSaving, setIsSaving] = useState(false);

  // Akses Form State
  const [aksesForm, setAksesForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || 'cashier',
    outlet_id: user?.outlet_id || '',
    is_active: user !== null ? user.is_active : true,
    new_password: ''
  });

  // HR Form State
  const [hrForm, setHrForm] = useState<Partial<EmployeeProfile>>({
    bank_name: user?.profile?.bank_name || '',
    bank_account: user?.profile?.bank_account || '',
    bank_account_name: user?.profile?.bank_account_name || '',
    emergency_contact_name: user?.profile?.emergency_contact_name || '',
    emergency_contact_phone: user?.profile?.emergency_contact_phone || '',
    employment_type: user?.profile?.employment_type || 'full_time',
    accessible_menus: user?.profile?.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR OTR', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'],
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    let currentUserId = user?.id;

    // 1. Create or Update User Credentials
    if (!isEdit) {
      if (!aksesForm.new_password) { alert('Sandi wajib diisi untuk karyawan baru!'); setIsSaving(false); return; }
      
      const res = await db.createUser(
        aksesForm.username, 
        aksesForm.email, 
        aksesForm.new_password, 
        aksesForm.name, 
        aksesForm.role as UserRole
      );
      if (!res) { alert('Gagal membuat user. Mungkin username sudah dipakai.'); setIsSaving(false); return; }
      currentUserId = res.id;

      // Assign Outlet & Status if different from default
      await db.updateUserAccess(currentUserId, { outlet_id: aksesForm.outlet_id || null, is_active: aksesForm.is_active });

    } else if (currentUserId) {
      // Update Access
      const updates: any = { 
        is_active: aksesForm.is_active, 
        outlet_id: aksesForm.outlet_id || null 
      };
      if (aksesForm.new_password) {
        updates.password_hash = aksesForm.new_password; // In real app, must hash!
      }
      await db.updateUserAccess(currentUserId, updates);
      // PENTING: Untuk edit nama & username butuh update biasa. (Di db.ts sementara blm ada full update user info)
      // Demi simplisitas, di demo ini kita biarkan nama/username statis setelah create.
    }

    // 2. Upsert HR Profile
    if (currentUserId) {
      await db.upsertEmployeeProfile({
        user_id: currentUserId,
        ...hrForm
      } as EmployeeProfile);
    }

    alert('Data Karyawan berhasil disimpan!');
    onSuccess();
  };

  const inputClass = "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors text-sm";
  const labelClass = "block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* MODAL SIDEBAR TABS */}
        <div className="bg-gray-50 border-r md:w-64 p-6 flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{isEdit ? 'Edit Karyawan' : 'Tambah Baru'}</h3>
            <p className="text-xs text-gray-500 mb-6">{isEdit ? 'Ubah mutasi dan akses.' : 'Daftarkan login kasir.'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('akses')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'akses' ? 'bg-white shadow text-blue-600 border border-gray-200/60' : 'text-gray-500 hover:bg-gray-200/50'}`}
            >
              <KeyRound className="w-4 h-4" /> Profil Utama
            </button>
            <button 
              onClick={() => setActiveTab('hr')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'hr' ? 'bg-white shadow text-blue-600 border border-gray-200/60' : 'text-gray-500 hover:bg-gray-200/50'}`}
            >
              <WalletCards className="w-4 h-4" /> Data Internal HR
            </button>
            <button 
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'menu' ? 'bg-white shadow text-blue-600 border border-gray-200/60' : 'text-gray-500 hover:bg-gray-200/50'}`}
            >
              <ShieldAlert className="w-4 h-4" /> Akses Menu
            </button>
          </div>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto w-full">
          <form onSubmit={handleSave} className="p-8 space-y-6">
            
            {/* TAB: AKSES KASIR */}
            {activeTab === 'akses' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6 flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-800">Bagian ini mengontrol izin masuk (login) ke aplikasi dan menentukan outlet mana yang dapat diakses oleh kasir (Mutasi Otomatis).</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}>Nama Lengkap</label>
                    <input type="text" value={aksesForm.name} onChange={e=>setAksesForm({...aksesForm, name: e.target.value})} disabled={isEdit} className={inputClass} required />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}>Username Login</label>
                    <input type="text" value={aksesForm.username} onChange={e=>setAksesForm({...aksesForm, username: e.target.value.toLowerCase()})} disabled={isEdit} className={inputClass} required />
                  </div>
                </div>
                
                <div>
                  <label className={labelClass}>
                    Reset Sandi (Password) 
                    {isEdit && user?.password_hash && (
                      <span className="text-orange-600 normal-case ml-2 font-normal">
                        (Sandi Saat Ini: <b className="font-mono text-sm bg-orange-100 px-1 py-0.5 rounded">{user.password_hash}</b>)
                      </span>
                    )}
                  </label>
                  <input type="text" placeholder={isEdit ? "Ketik sandi baru untuk mereset sandi lama..." : "Sandi rahasia"} value={aksesForm.new_password} onChange={e=>setAksesForm({...aksesForm, new_password: e.target.value})} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="col-span-2">
                    <label className={labelClass}>Pilih Penempatan Outlet (Mutasi)</label>
                    <select value={aksesForm.outlet_id} onChange={e=>setAksesForm({...aksesForm, outlet_id: e.target.value})} className={inputClass}>
                      <option value="">Belum Ditentukan (Tarik Penempatan)</option>
                      {outlets.map(o => (
                        <option key={o.id} value={o.id}>{o.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Hak Akses</label>
                    <select value={aksesForm.role} onChange={e=>setAksesForm({...aksesForm, role: e.target.value as UserRole})} className={inputClass} disabled={isEdit}>
                      <option value="cashier">Kasir Biasa</option>
                      <option value="admin">Admin Backoffice</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Status Akun (Suspend)</label>
                    <select value={aksesForm.is_active ? 'yes' : 'no'} onChange={e=>setAksesForm({...aksesForm, is_active: e.target.value === 'yes'})} className={inputClass}>
                      <option value="yes">🟢 AKTIF BISA LOGIN</option>
                      <option value="no">🔴 DIURUNGKAN / DIBLOKIR</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DATA INTERNAL HR */}
            {activeTab === 'hr' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl mb-6 flex gap-3">
                  <BadgeCheck className="w-5 h-5 text-orange-500 shrink-0" />
                  <p className="text-xs text-orange-800">Bagian ini hanya bersifat catatan HRD Anda (seperti rekening gaji). Kasir tidak akan melihat ini.</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Building className="w-4 h-4"/> Informasi Rekening Gaji</h4>
                  <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-gray-50/50">
                    <div className="col-span-2">
                      <label className={labelClass}>Nama Bank (cth: BCA)</label>
                      <input type="text" value={hrForm.bank_name || ''} onChange={e=>setHrForm({...hrForm, bank_name: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Nomor Rekening</label>
                      <input type="text" value={hrForm.bank_account || ''} onChange={e=>setHrForm({...hrForm, bank_account: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Nama Pemilik Rek.</label>
                      <input type="text" value={hrForm.bank_account_name || ''} onChange={e=>setHrForm({...hrForm, bank_account_name: e.target.value})} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="col-span-2">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Phone className="w-4 h-4"/> Kontak Darurat Keluarga</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Nama Istri/Suami/Ibu" value={hrForm.emergency_contact_name || ''} onChange={e=>setHrForm({...hrForm, emergency_contact_name: e.target.value})} className={inputClass} />
                      <input type="text" placeholder="No Telepon Darurat" value={hrForm.emergency_contact_phone || ''} onChange={e=>setHrForm({...hrForm, emergency_contact_phone: e.target.value})} className={inputClass} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4"/> Tipe Shift Kerja</h4>
                    <select value={hrForm.employment_type || 'full_time'} onChange={e=>setHrForm({...hrForm, employment_type: e.target.value as any})} className={inputClass}>
                      <option value="full_time">Karyawan Outlet (Full Time)</option>
                      <option value="part_time">Karyawan Outlet (Part Time/Cadangan)</option>
                      <option value="otr_driver">Tim Keliling OTR (Supir/Sales)</option>
                    </select>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: AKSES MENU (RBAC) */}
            {activeTab === 'menu' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl mb-6 flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-purple-500 shrink-0" />
                  <div className="text-xs text-purple-800">
                    <p className="font-bold mb-1">Pembatasan Sidebar (Role-Based Access)</p>
                    <p>Centang grup menu di bawah ini untuk mengizinkan staf melihatnya di menu samping. Anda bebas menentukan menu mana saja yang mereka butuhkan.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'DONATTOUR STORE', desc: 'Menu Penjualan Toko Asli' },
                    { id: 'DONATTOUR OTR', desc: 'Menu untuk Jualan di Jalan' },
                    { id: 'DONATTOUR ONLINE', desc: 'Pencatatan Gofood/Grab' },
                    { id: 'DONATTOUR MANAGEMENT', desc: 'Pengaturan Karyawan, dsb' },
                  ].map(menuItem => {
                    // Default values: Jika array menunya tidak null (berarti sudah disave), ikuti isi array. 
                    // Jika null/kosong dan dia admin, defaultnya ON semua.
                    let isChecked = hrForm.accessible_menus?.includes(menuItem.id) ?? false;
                    
                    if (hrForm.accessible_menus === undefined || hrForm.accessible_menus === null) {
                      if (aksesForm.role === 'admin' || aksesForm.role === 'owner') {
                        isChecked = true;
                      } else {
                        // Kalau kasir baru, defaultnya kasir & OTR aja, dll as per UI (di setState awal kita kasih 4-4nya)
                        isChecked = true;
                      }
                    }

                    return (
                      <label key={menuItem.id} className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${isChecked ? 'bg-purple-50/50 border-purple-200' : 'bg-gray-50 border-gray-200 grayscale-50 opacity-70'} hover:bg-purple-50`}>
                        <div className="pt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentMenus = hrForm.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR OTR', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'];
                              if (e.target.checked) {
                                // Add if not exist
                                if (!currentMenus.includes(menuItem.id)) {
                                  setHrForm({...hrForm, accessible_menus: [...currentMenus, menuItem.id]});
                                }
                              } else {
                                setHrForm({...hrForm, accessible_menus: currentMenus.filter(m => m !== menuItem.id)});
                              }
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{menuItem.id}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{menuItem.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-center text-gray-500 border-t py-4 mt-4">
                  Secara default saat penambahan akun baru, kami mencentang ke-4 akses. 
                  Anda bebas mencabut akses mana pun tanpa terkecuali baik itu akun Kasir maupun akun Admin.
                </p>
              </div>
            )}

            {/* MODAL FOOTER */}
            <div className="pt-6 mt-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <Button type="button" onClick={onClose} variant="ghost" className="rounded-xl text-gray-500">Batal</Button>
              <Button type="submit" disabled={isSaving} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8 shadow-md">
                {isSaving ? 'Menyimpan...' : 'Simpan Semua Data'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
