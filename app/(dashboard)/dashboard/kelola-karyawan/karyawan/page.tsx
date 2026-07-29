'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import type { UserWithProfile, Outlet, UserRole, EmployeeProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Users, Search, Plus, Save, Loader2, Check, Store, Building, ChevronDown, ChevronUp, Lock, WalletCards, ShieldAlert, Trash2, CalendarIcon } from 'lucide-react';

export default function KelolaKaryawanPage() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewRow, setShowNewRow] = useState(false);
  
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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama karyawan..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <Button onClick={() => setShowNewRow(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm font-bold text-xs h-9">
          <Plus className="w-4 h-4 mr-1" /> Tambah Staf Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4">Informasi Pegawai</th>
                  <th className="px-6 py-4">Bergabung</th>
                  <th className="px-6 py-4">Posisi</th>
                  <th className="px-6 py-4">Penugasan Outlet</th>
                  <th className="px-6 py-4">Rekening Bank</th>
                  <th className="px-6 py-4">Kontak Darurat</th>
                  <th className="px-6 py-4">Hak Akses Menu</th>
                  <th className="px-6 py-4">Status & Login</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {showNewRow && (
                  <ExpandableEmployeeRow 
                    user={null} 
                    outlets={outlets} 
                    onSuccess={() => { setShowNewRow(false); loadData(); }} 
                    onCancel={() => setShowNewRow(false)}
                    isInitiallyExpanded={true}
                  />
                )}
                
                {filteredUsers.length === 0 && !showNewRow ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-400">
                      Tidak ada data staf ditemukan.
                    </td>
                  </tr>
                ) : filteredUsers.map((u) => (
                  <ExpandableEmployeeRow 
                    key={u.id} 
                    user={u} 
                    outlets={outlets} 
                    onSuccess={loadData} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors text-xs font-medium text-slate-800 placeholder-slate-400";
const labelStyle = "block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider";

function ExpandableEmployeeRow({ user, outlets, onSuccess, onCancel, isInitiallyExpanded = false }: { user: UserWithProfile | null, outlets: Outlet[], onSuccess: () => void, onCancel?: () => void, isInitiallyExpanded?: boolean }) {
  const isNew = !user;
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Default join date is today for new users, or their actual DB created_at for existing users
  const defaultJoinDate = user?.profile?.join_date 
    ? user.profile.join_date 
    : (user?.created_at ? user.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);

  // HR Form State
  const [hrForm, setHrForm] = useState({
    bank_name: user?.profile?.bank_name || '',
    bank_account: user?.profile?.bank_account || '',
    bank_account_name: user?.profile?.bank_account_name || '',
    emergency_contact_name: user?.profile?.emergency_contact_name || '',
    emergency_contact_phone: user?.profile?.emergency_contact_phone || '',
    employment_type: user?.profile?.employment_type || 'full_time',
    accessible_menus: user?.profile?.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR KARYAWAN', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'],
    join_date: defaultJoinDate
  });

  const handleSave = async () => {
    setIsSaving(true);
    let currentUserId = user?.id;

    if (isNew) {
      if (!aksesForm.new_password) { alert('Sandi wajib diisi untuk karyawan baru!'); setIsSaving(false); return; }
      if (!aksesForm.name || !aksesForm.username) { alert('Nama dan Username wajib diisi!'); setIsSaving(false); return; }
      
      const res = await db.createUser(
        aksesForm.username, 
        aksesForm.email, 
        aksesForm.new_password, 
        aksesForm.name, 
        aksesForm.role as UserRole
      );
      if (!res) { alert('Gagal membuat user. Mungkin username sudah dipakai.'); setIsSaving(false); return; }
      currentUserId = res.id;

      await db.updateUserAccess(currentUserId, { outlet_id: aksesForm.outlet_id || null, is_active: aksesForm.is_active });
    } else if (currentUserId) {
      const updates: any = { 
        is_active: aksesForm.is_active, 
        outlet_id: aksesForm.outlet_id || null 
      };
      if (aksesForm.new_password) {
        updates.password_hash = aksesForm.new_password; 
      }
      await db.updateUserAccess(currentUserId, updates);
    }

    if (currentUserId) {
      await db.upsertEmployeeProfile({
        user_id: currentUserId,
        ...hrForm
      } as EmployeeProfile);
    }

    setIsSaving(false);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setIsExpanded(false);
      onSuccess();
    }, 1000);
  };

  const menuOptions = [
    { id: 'DONATTOUR STORE', label: 'DONATTOUR STORE' },
    { id: 'DONATTOUR KARYAWAN', label: 'DONATTOUR KARYAWAN' },
    { id: 'DONATTOUR ONLINE', label: 'DONATTOUR ONLINE' },
    { id: 'DONATTOUR MANAGEMENT', label: 'DONATTOUR MANAGEMENT' }
  ];

  const getDuration = (dateString?: string | null) => {
    if (!dateString) return '-';
    const start = new Date(dateString);
    const end = new Date();
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    const parts = [];
    if (years > 0) parts.push(`${years} Tahun`);
    if (months > 0) parts.push(`${months} Bulan`);
    if (days > 0) parts.push(`${days} Hari`);
    
    return parts.length > 0 ? parts.join(', ') : 'Baru saja';
  };

  return (
    <>
      {/* SUMMARY ROW */}
      {!isNew && (
        <tr className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isExpanded ? 'bg-blue-50/20' : ''}`} onClick={() => setIsExpanded(!isExpanded)}>
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-400">@{user.username}</p>
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-slate-800">
                {hrForm.join_date ? new Date(hrForm.join_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </span>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded w-max mt-1">
                Lama: {getDuration(hrForm.join_date)}
              </span>
            </div>
          </td>
          <td className="px-6 py-4">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
              user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
              user.role === 'cashier' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {user.role.toUpperCase()}
            </span>
          </td>
          <td className="px-6 py-4">
            {user.outlet ? (
              <div className="flex items-center gap-1.5 text-orange-700 font-semibold bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100 inline-flex w-max text-xs">
                <Store className="w-3.5 h-3.5" /> {user.outlet.nama}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 inline-flex w-max text-xs">
                <Building className="w-3.5 h-3.5" /> Lintas Outlet
              </div>
            )}
          </td>
          <td className="px-6 py-4">
            {user.profile?.bank_name ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-800 uppercase">{user.profile.bank_name}</span>
                <span className="text-xs text-slate-500 font-mono">{user.profile.bank_account || '-'}</span>
                <span className="text-[10px] text-slate-400 line-clamp-1">{user.profile.bank_account_name || '-'}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Belum di-set</span>
            )}
          </td>
          <td className="px-6 py-4">
            {user.profile?.emergency_contact_name ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-800">{user.profile.emergency_contact_name}</span>
                <span className="text-xs text-slate-500 font-mono">{user.profile.emergency_contact_phone || '-'}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Belum di-set</span>
            )}
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-wrap gap-1 max-w-[120px]">
              {(user.profile?.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR KARYAWAN', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT']).map((m, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 truncate w-full text-center" title={m}>
                  {m.replace('DONATTOUR ', '')}
                </span>
              ))}
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col gap-1">
              <span className={`flex items-center gap-1 text-xs font-bold ${user.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {user.is_active ? 'AKTIF' : 'SUSPEND'}
              </span>
              <p className="text-[11px] text-slate-400">
                Login: {user.last_login ? new Date(user.last_login).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}
              </p>
            </div>
          </td>
          <td className="px-6 py-4 text-right">
            <Button variant="ghost" size="sm" className="rounded-xl text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 transition-all">
              Edit Data
              {isExpanded ? <ChevronUp className="w-5 h-5 ml-1" /> : <ChevronDown className="w-5 h-5 ml-1" />}
            </Button>
          </td>
        </tr>
      )}

      {/* EXPANDED EDIT FORM ROW (ALIGNED TO COLUMNS) */}
      {isExpanded && (
        <tr className="bg-slate-50/80 border-b-2 border-slate-200 shadow-inner align-top">
          {/* 1. Informasi Pegawai */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-3 animate-in fade-in duration-300 delay-75">
              <div>
                <label className={labelStyle}>Nama Lengkap</label>
                <input type="text" value={aksesForm.name} onChange={e=>setAksesForm({...aksesForm, name: e.target.value})} disabled={!isNew} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Username</label>
                <input type="text" value={aksesForm.username} onChange={e=>setAksesForm({...aksesForm, username: e.target.value.toLowerCase()})} disabled={!isNew} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Sandi Login {user?.password_hash && <span className="text-orange-500 normal-case">(Saat ini: {user.password_hash})</span>}</label>
                <input type="text" placeholder={isNew ? "Ketik sandi..." : "Kosongkan jika tetap"} value={aksesForm.new_password} onChange={e=>setAksesForm({...aksesForm, new_password: e.target.value})} className={inputStyle} />
              </div>
            </div>
          </td>

          {/* 2. Bergabung */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-3 animate-in fade-in duration-300 delay-100">
              <div>
                <label className={labelStyle}>Tanggal Masuk</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white border-slate-200 hover:bg-slate-50 text-xs px-3 py-2 h-auto",
                        !hrForm.join_date && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                      {hrForm.join_date ? format(parseISO(hrForm.join_date), 'PPP', { locale: id }) : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-slate-200 shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={hrForm.join_date ? parseISO(hrForm.join_date) : undefined}
                      onSelect={(date) => setHrForm({ ...hrForm, join_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                      initialFocus
                      locale={id}
                      captionLayout="dropdown"
                      fromYear={2015}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </td>

          {/* 3. Posisi */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-3 animate-in fade-in duration-300 delay-100">
              <div>
                <label className={labelStyle}>Posisi / Jabatan</label>
                <select value={aksesForm.role} onChange={e=>setAksesForm({...aksesForm, role: e.target.value as UserRole})} className={inputStyle} disabled={!isNew}>
                  <option value="cashier">Kasir / Staf Biasa</option>
                  <option value="admin">Admin Backoffice</option>
                </select>
              </div>
            </div>
          </td>

          {/* 4. Penugasan Outlet */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-3 animate-in fade-in duration-300 delay-150">
              <div>
                <label className={labelStyle}>Penempatan Outlet</label>
                <select value={aksesForm.outlet_id} onChange={e=>setAksesForm({...aksesForm, outlet_id: e.target.value})} className={inputStyle}>
                  <option value="">Semua Outlet / Lintas Toko</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.nama}</option>
                  ))}
                </select>
              </div>
            </div>
          </td>

          {/* 5. Rekening Bank */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-3 animate-in fade-in duration-300 delay-200">
              <div>
                <label className={labelStyle}>Bank</label>
                <input type="text" placeholder="BCA / Mandiri / dll" value={hrForm.bank_name} onChange={e=>setHrForm({...hrForm, bank_name: e.target.value})} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>No. Rekening</label>
                <input type="text" placeholder="08xxxxxxxx" value={hrForm.bank_account} onChange={e=>setHrForm({...hrForm, bank_account: e.target.value})} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Atas Nama</label>
                <input type="text" placeholder="A/n Pemilik Rekening" value={hrForm.bank_account_name} onChange={e=>setHrForm({...hrForm, bank_account_name: e.target.value})} className={inputStyle} />
              </div>
            </div>
          </td>

          {/* 6. Kontak Darurat */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-3 animate-in fade-in duration-300 delay-300">
              <div>
                <label className={labelStyle}>Nama Darurat</label>
                <input type="text" placeholder="Istri / Suami / Ibu" value={hrForm.emergency_contact_name} onChange={e=>setHrForm({...hrForm, emergency_contact_name: e.target.value})} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>No. Telepon Darurat</label>
                <input type="text" placeholder="08xxxxxxxx" value={hrForm.emergency_contact_phone} onChange={e=>setHrForm({...hrForm, emergency_contact_phone: e.target.value})} className={inputStyle} />
              </div>
            </div>
          </td>

          {/* 7. Hak Akses Menu */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-3 animate-in fade-in duration-300 delay-400">
              <div>
                <label className={labelStyle}>Hak Akses Menu Sidebar</label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {menuOptions.map(m => {
                    const isChecked = hrForm.accessible_menus?.includes(m.id) ?? true;
                    return (
                      <label key={m.id} className={`flex items-center gap-2 p-1.5 border rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-purple-50/50 border-purple-200 text-purple-800' : 'bg-white border-slate-200 text-slate-400'}`}>
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentMenus = hrForm.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR KARYAWAN', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'];
                            if (e.target.checked) {
                              if (!currentMenus.includes(m.id)) setHrForm({...hrForm, accessible_menus: [...currentMenus, m.id]});
                            } else {
                              setHrForm({...hrForm, accessible_menus: currentMenus.filter(x => x !== m.id)});
                            }
                          }}
                        />
                        <span className="text-[10px] font-bold line-clamp-1 leading-tight">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </td>

          {/* 8. Status & Login */}
          <td className="p-5 border-r border-slate-200/60">
            <div className="space-y-4 animate-in fade-in duration-300 delay-500">
              <div>
                <label className={labelStyle}>Status Akun</label>
                <select value={aksesForm.is_active ? 'yes' : 'no'} onChange={e=>setAksesForm({...aksesForm, is_active: e.target.value === 'yes'})} className={`${inputStyle} ${aksesForm.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                  <option value="yes">AKTIF</option>
                  <option value="no">SUSPEND / BLOKIR</option>
                </select>
              </div>
            </div>
          </td>

          {/* 9. Aksi */}
          <td className="p-5">
            <div className="flex flex-col gap-2 animate-in fade-in duration-300 delay-700">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className={`w-full rounded-xl font-bold text-xs h-10 shadow-sm transition-all ${isSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSuccess ? <><Check className="w-4 h-4 mr-1"/> Tersimpan</> : <><Save className="w-4 h-4 mr-1"/> Simpan</>}
              </Button>
              {onCancel && (
                <Button variant="outline" size="sm" onClick={onCancel} className="w-full text-xs h-9 rounded-xl font-bold text-slate-500 hover:text-slate-700 border-slate-200">
                  Batal
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
