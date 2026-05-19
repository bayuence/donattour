import os
import shutil

# Path yang dibutuhkan
base_path = r"c:\Users\bayue\Desktop\donattourSYSTEM"
analytics_dir = os.path.join(base_path, "app", "dashboard", "analytics")
wrong_file = os.path.join(base_path, "app", "(analytics-page).tsx")

# 1. Buat folder analytics
os.makedirs(analytics_dir, exist_ok=True)
print("✅ Folder analytics berhasil dibuat!")

# 2. Buat file page.tsx
page_content = '''import { AnalyticsDashboard } from "@/components/analytics-dashboard"

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
'''

page_path = os.path.join(analytics_dir, "page.tsx")
with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_content)
print("✅ File page.tsx berhasil dibuat!")

# 3. Hapus file yang salah lokasi
if os.path.exists(wrong_file):
    os.remove(wrong_file)
    print("🗑️ File lama yang salah lokasi berhasil dihapus!")

print("\n✨ Selesai! Halaman analytics sudah siap di /dashboard/analytics")
