"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts"
import { 
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, 
  Package, Users, Calendar, Award 
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AnalyticsDashboardProps {
  dateRange?: "today" | "week" | "month" | "year" | "custom"
  outletId?: string
}

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']

export function AnalyticsDashboard({ dateRange = "today", outletId }: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange)

  // Simulasi data - nanti akan diganti dengan real data dari Supabase
  const salesData = useMemo(() => {
    const generateData = () => {
      switch(selectedPeriod) {
        case "today":
          return Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            penjualan: Math.floor(Math.random() * 500000) + 100000,
            transaksi: Math.floor(Math.random() * 30) + 5
          }))
        case "week":
          return ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Ming"].map(day => ({
            time: day,
            penjualan: Math.floor(Math.random() * 3000000) + 1000000,
            transaksi: Math.floor(Math.random() * 150) + 50
          }))
        case "month":
          return Array.from({ length: 30 }, (_, i) => ({
            time: `${i + 1}`,
            penjualan: Math.floor(Math.random() * 3000000) + 1000000,
            transaksi: Math.floor(Math.random() * 150) + 50
          }))
        default:
          return []
      }
    }
    return generateData()
  }, [selectedPeriod])

  const topProducts = [
    { name: "Donat Coklat", sold: 145, revenue: 1450000, percentage: 28 },
    { name: "Donat Strawberry", sold: 123, revenue: 1230000, percentage: 24 },
    { name: "Donat Vanilla", sold: 98, revenue: 980000, percentage: 19 },
    { name: "Es Teh Manis", sold: 87, revenue: 435000, percentage: 17 },
    { name: "Kopi Susu", sold: 62, revenue: 620000, percentage: 12 },
  ]

  const categoryData = [
    { name: "Donat Classic", value: 4500000, percentage: 45 },
    { name: "Donat Premium", value: 3200000, percentage: 32 },
    { name: "Minuman", value: 1800000, percentage: 18 },
    { name: "Paket OTR", value: 500000, percentage: 5 },
  ]

  const outletComparison = [
    { outlet: "Outlet Pusat", penjualan: 8500000, transaksi: 245, target: 10000000 },
    { outlet: "Outlet Mall", penjualan: 7200000, transaksi: 198, target: 8000000 },
    { outlet: "Outlet Timur", penjualan: 5800000, transaksi: 167, target: 6000000 },
    { outlet: "OTR Mobile", penjualan: 3200000, transaksi: 89, target: 4000000 },
  ]

  const metrics = {
    totalRevenue: 24700000,
    totalTransactions: 699,
    avgTransaction: 35336,
    totalProducts: 515,
    growthRate: 12.5,
    topCustomers: 48
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header dengan Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +{metrics.growthRate}% dari periode sebelumnya
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Rata-rata: {formatCurrency(metrics.avgTransaction)}/transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Terjual</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Unit terjual hari ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Customers</CardTitle>
            <Award className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.topCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Pelanggan dengan transaksi &gt;2x
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Hari Ini</TabsTrigger>
          <TabsTrigger value="week">Minggu Ini</TabsTrigger>
          <TabsTrigger value="month">Bulan Ini</TabsTrigger>
          <TabsTrigger value="year">Tahun Ini</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-4">
          {/* Sales Trend Chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Trend Penjualan</CardTitle>
                <CardDescription>
                  Grafik penjualan {selectedPeriod === "today" ? "per jam" : selectedPeriod === "week" ? "per hari" : "per tanggal"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorPenjualan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="penjualan" 
                      stroke="#f97316" 
                      fillOpacity={1} 
                      fill="url(#colorPenjualan)" 
                      name="Penjualan (IDR)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Products & Category Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Produk Terlaris</CardTitle>
                <CardDescription>Produk dengan penjualan tertinggi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold",
                          index === 0 ? "bg-orange-600" : "bg-orange-400"
                        )}>
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.sold} unit • {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-orange-600">
                        {product.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Penjualan per Kategori</CardTitle>
                <CardDescription>Distribusi revenue berdasarkan kategori</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Outlet Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Perbandingan Performa Outlet</CardTitle>
              <CardDescription>Penjualan dan pencapaian target per outlet</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={outletComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="outlet" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Bar dataKey="penjualan" fill="#f97316" name="Penjualan Aktual" />
                  <Bar dataKey="target" fill="#fed7aa" name="Target" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2">
                {outletComparison.map((outlet, index) => {
                  const achievement = (outlet.penjualan / outlet.target) * 100
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{outlet.outlet}</span>
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "font-semibold",
                          achievement >= 100 ? "text-green-600" : achievement >= 80 ? "text-orange-600" : "text-red-600"
                        )}>
                          {achievement.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">
                          ({outlet.transaksi} transaksi)
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
