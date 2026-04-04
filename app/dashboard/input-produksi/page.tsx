'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DonatStatusBadge } from '@/components/inventory/donat-status-badge'
import { CheckCircle2, XCircle, Plus } from 'lucide-react'

interface ProductionInput {
  outlet_id: string
  tanggal: string
  target_produksi: number
  qty_ready: number
  qty_waste: number
  catatan: string
}

export default function InputProduksiPage() {
  const [formData, setFormData] = useState<ProductionInput>({
    outlet_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    target_produksi: 200,
    qty_ready: 0,
    qty_waste: 0,
    catatan: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Demo data outlets
  const outlets = [
    { id: '1', nama: 'Outlet Pusat', kode: 'OUT-PUSAT' },
    { id: '2', nama: 'Outlet Mall', kode: 'OUT-MALL' },
    { id: '3', nama: 'Outlet Timur', kode: 'OUT-TIMUR' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulasi save ke database
    // TODO: Nanti replace dengan actual API call ke Supabase
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('Production Input:', formData)

    // Show success message
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)

    // Reset form
    setFormData({
      outlet_id: formData.outlet_id,
      tanggal: new Date().toISOString().split('T')[0],
      target_produksi: 200,
      qty_ready: 0,
      qty_waste: 0,
      catatan: ''
    })

    setIsSubmitting(false)
  }

  // Calculate percentage
  const successRate = formData.target_produksi > 0 
    ? ((formData.qty_ready / formData.target_produksi) * 100).toFixed(1)
    : 0
  
  const wasteRate = formData.target_produksi > 0
    ? ((formData.qty_waste / formData.target_produksi) * 100).toFixed(1)
    : 0

  const total = formData.qty_ready + formData.qty_waste

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Input Produksi</h1>
        <p className="text-muted-foreground mt-2">
          Catat hasil produksi harian: berapa donat yang berhasil dan berapa yang gagal
        </p>
      </div>

      <div className="space-y-6">
        {/* Success Message */}
        {showSuccess && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">
                  ✅ Produksi berhasil disimpan! {formData.qty_ready} donat READY, {formData.qty_waste} WASTE
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Input Produksi Harian
            </CardTitle>
            <CardDescription>
              Input hasil produksi donat: berapa yang berhasil (READY) dan berapa yang gagal (WASTE)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Outlet Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="outlet">Outlet *</Label>
                  <select 
                    id="outlet"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.outlet_id}
                    onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
                    required
                  >
                    <option value="">Pilih outlet...</option>
                    {outlets.map(outlet => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.nama} ({outlet.kode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal Produksi *</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Target Produksi */}
              <div className="space-y-2">
                <Label htmlFor="target">Target Produksi *</Label>
                <Input
                  id="target"
                  type="number"
                  min="1"
                  value={formData.target_produksi}
                  onChange={(e) => setFormData({ ...formData, target_produksi: parseInt(e.target.value) || 0 })}
                  placeholder="200"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Berapa donat yang ditargetkan produksi hari ini?
                </p>
              </div>

              <div className="border-t pt-4" />

              {/* Hasil Produksi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* READY */}
                <div className="space-y-2">
                  <Label htmlFor="ready" className="flex items-center gap-2">
                    <DonatStatusBadge status="ready" showIcon />
                    Donat Berhasil (READY) *
                  </Label>
                  <Input
                    id="ready"
                    type="number"
                    min="0"
                    value={formData.qty_ready || ''}
                    onChange={(e) => setFormData({ ...formData, qty_ready: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="text-lg font-semibold"
                    required
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 bg-green-100 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                    <span className="text-green-700 font-medium">{successRate}%</span>
                  </div>
                </div>

                {/* WASTE */}
                <div className="space-y-2">
                  <Label htmlFor="waste" className="flex items-center gap-2">
                    <DonatStatusBadge status="waste" showIcon />
                    Donat Gagal (WASTE) *
                  </Label>
                  <Input
                    id="waste"
                    type="number"
                    min="0"
                    value={formData.qty_waste || ''}
                    onChange={(e) => setFormData({ ...formData, qty_waste: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="text-lg font-semibold"
                    required
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 bg-red-100 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${wasteRate}%` }}
                      />
                    </div>
                    <span className="text-red-700 font-medium">{wasteRate}%</span>
                  </div>
                </div>
              </div>

              {/* Total Check */}
              <Card className={total !== formData.target_produksi && total > 0 ? 'border-yellow-500 bg-yellow-50' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Input</p>
                      <p className="text-2xl font-bold">{total} donat</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="text-2xl font-bold">{formData.target_produksi} donat</p>
                    </div>
                  </div>
                  {total !== formData.target_produksi && total > 0 && (
                    <p className="text-sm text-yellow-700 mt-2 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Perhatian: Total ({total}) tidak sama dengan target ({formData.target_produksi})
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Catatan */}
              <div className="space-y-2">
                <Label htmlFor="catatan">Catatan (Optional)</Label>
                <Textarea
                  id="catatan"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Contoh: Banyak yang gosong karena oven rusak..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isSubmitting || !formData.outlet_id}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Simpan Produksi
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-blue-600 text-2xl">💡</div>
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">Tips Input Produksi:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Input segera setelah produksi selesai untuk data akurat</li>
                  <li>Donat READY akan otomatis masuk ke inventory dan siap dijual</li>
                  <li>Donat WASTE akan dicatat untuk laporan pemborosan</li>
                  <li>Owner bisa lihat real-time di Dashboard Monitoring</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
