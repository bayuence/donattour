'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DonatStatusBadge, DonatStatusBadgeWithTooltip, DonatStatusFilter, type DonatStatus } from './donat-status-badge'
import { getInventorySummary } from '@/lib/db'

interface InventoryItem {
  outlet: string;
  raw: number;
  qc: number;
  ready: number;
  sold: number;
  waste: number;
  rejected: number;
  otr: number;
  [key: string]: string | number; // Fallback for dynamic access
}

export function InventoryStatusDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<DonatStatus | 'all'>('all')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInventory() {
      const data = await getInventorySummary()
      setInventory(data)
      setLoading(false)
    }
    loadInventory()
  }, [])
  
  // Calculate totals
  const totals = inventory.reduce((acc, item) => {
    acc.raw += item.raw || 0
    acc.qc += item.qc || 0
    acc.ready += item.ready || 0
    acc.sold += item.sold || 0
    acc.waste += item.waste || 0
    acc.rejected += item.rejected || 0
    acc.otr += item.otr || 0
    return acc
  }, { raw: 0, qc: 0, ready: 0, sold: 0, waste: 0, rejected: 0, otr: 0 })

  if (loading) {
    return <div className="p-20 text-center text-muted-foreground animate-pulse">Memuat data inventori...</div>
  }

  const statusList: DonatStatus[] = ['raw', 'qc', 'ready', 'sold', 'waste', 'rejected', 'otr']
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Status Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor status donat real-time di semua outlet
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Status</CardTitle>
          <CardDescription>Pilih status untuk melihat detail</CardDescription>
        </CardHeader>
        <CardContent>
          <DonatStatusFilter selected={selectedStatus} onChange={setSelectedStatus} />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusList.map((status) => (
          <Card key={status} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <DonatStatusBadge status={status} size="sm" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals[status]}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total dari semua outlet
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per Outlet Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status per Outlet</CardTitle>
          <CardDescription>Breakdown inventory setiap outlet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventory.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{item.outlet}</h3>
                  <div className="text-sm text-muted-foreground">
                    Total: {Object.values(item).reduce((a: number, b) => typeof b === 'number' ? a + b : a, 0) - (item.sold || 0)} pcs aktif
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {statusList.map((status: any) => (
                    <div key={status} className="text-center">
                      <DonatStatusBadgeWithTooltip 
                        status={status} 
                        quantity={item[status] as number}
                        className="mb-1"
                      />
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>Progress produksi hari ini:</span>
                    <span className="font-semibold">
                      {Math.round((item.sold / (item.raw + item.qc + item.ready + item.sold)) * 100)}% terjual
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all"
                      style={{ width: `${(item.sold / (item.raw + item.qc + item.ready + item.sold)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Alerts */}
                {item.ready < 20 && (
                  <div className="mt-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                    ⚠️ Stok READY rendah! Perlu topping lebih banyak donat.
                  </div>
                )}
                {item.waste > 10 && (
                  <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    🚨 Waste tinggi! Perlu review proses produksi.
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Alur Status Donat</CardTitle>
          <CardDescription>Lifecycle donat dari produksi hingga terjual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <DonatStatusBadge status="raw" />
            <span className="text-2xl text-gray-400">→</span>
            <DonatStatusBadge status="qc" />
            <span className="text-2xl text-gray-400">→</span>
            <DonatStatusBadge status="ready" />
            <span className="text-2xl text-gray-400">→</span>
            <DonatStatusBadge status="sold" />
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p className="mb-2">Status alternatif:</p>
            <div className="flex items-center justify-center gap-4">
              <DonatStatusBadge status="waste" size="sm" />
              <DonatStatusBadge status="rejected" size="sm" />
              <DonatStatusBadge status="otr" size="sm" />
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">📌 Penjelasan:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>RAW:</strong> Donat baru keluar dari dapur (tanpa topping)</li>
              <li>• <strong>QC:</strong> Sedang quality check oleh supervisor</li>
              <li>• <strong>READY:</strong> Sudah ditoping, siap dijual di kasir</li>
              <li>• <strong>SOLD:</strong> Terjual ke pelanggan</li>
              <li>• <strong>WASTE:</strong> Gagal produksi/rusak</li>
              <li>• <strong>REJECTED:</strong> Customer batal beli</li>
              <li>• <strong>OTR:</strong> Dibawa mobil OTR untuk jual keliling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
