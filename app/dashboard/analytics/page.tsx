import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Pantau performa bisnis secara real-time dengan visualisasi data lengkap
          </p>
        </div>
      </div>

      <AnalyticsDashboard />
    </div>
  )
}
