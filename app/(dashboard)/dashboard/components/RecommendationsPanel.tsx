'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface RecommendationsPanelProps {
  data: {
    production_sales: {
      target: number;
      success: number;
      waste: number;
      sold: number;
      remaining: number;
      waste_rate: number;
      sold_rate: number;
    };
    loss_breakdown: {
      production_waste: { amount: number; percentage: number };
      topping_error: { amount: number; percentage: number };
      non_topping_expired: { amount: number; percentage: number };
      finished_product_reject: { amount: number; percentage: number };
    };
    sales_by_product: Array<{
      product_id: string;
      product_name: string;
      qty: number;
      percentage: number;
    }>;
    financial_summary: {
      total_loss: number;
      margin: number;
    };
  };
  loading?: boolean;
}

interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
  icon: any;
}

export function RecommendationsPanel({ data, loading }: RecommendationsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations: Recommendation[] = [];

  // 1. Check waste rate (CRITICAL)
  if (data.production_sales.waste_rate > 15) {
    recommendations.push({
      id: 'high-waste-rate',
      priority: 'high',
      category: 'Produksi',
      title: '🚨 Waste Rate Tinggi!',
      description: `Waste rate hari ini ${data.production_sales.waste_rate.toFixed(1)}% (target: <15%). Ini ${((data.production_sales.waste_rate - 15) * data.production_sales.target / 100).toFixed(0)} pcs lebih banyak dari target.`,
      action: 'Review proses produksi, training ulang staff, dan cek kualitas bahan baku.',
      icon: AlertTriangle,
    });
  } else if (data.production_sales.waste_rate > 10) {
    recommendations.push({
      id: 'medium-waste-rate',
      priority: 'medium',
      category: 'Produksi',
      title: '⚠️ Waste Rate Perlu Perhatian',
      description: `Waste rate ${data.production_sales.waste_rate.toFixed(1)}% mendekati batas (target: <15%). Perlu monitoring ketat.`,
      action: 'Monitor proses produksi lebih ketat dan identifikasi penyebab waste.',
      icon: AlertCircle,
    });
  } else if (data.production_sales.waste_rate < 5) {
    recommendations.push({
      id: 'excellent-waste-rate',
      priority: 'low',
      category: 'Produksi',
      title: '✅ Waste Rate Excellent!',
      description: `Waste rate hanya ${data.production_sales.waste_rate.toFixed(1)}%. Pertahankan kualitas produksi ini!`,
      action: 'Dokumentasikan best practices dan share ke outlet lain.',
      icon: CheckCircle,
    });
  }

  // 2. Check biggest loss category
  const lossCategories = [
    { name: 'Gagal Produksi', data: data.loss_breakdown.production_waste, type: 'production' },
    { name: 'Salah Topping', data: data.loss_breakdown.topping_error, type: 'topping' },
    { name: 'Polos Expired', data: data.loss_breakdown.non_topping_expired, type: 'expired' },
    { name: 'Jadi Reject', data: data.loss_breakdown.finished_product_reject, type: 'reject' },
  ].sort((a, b) => b.data.amount - a.data.amount);

  const biggestLoss = lossCategories[0];
  if (biggestLoss.data.amount > 50000) {
    let action = '';
    if (biggestLoss.type === 'production') {
      action = 'Review SOP produksi, training staff, dan cek kualitas bahan baku.';
    } else if (biggestLoss.type === 'topping') {
      action = 'Training kasir untuk lebih teliti, gunakan checklist order, dan improve komunikasi.';
    } else if (biggestLoss.type === 'expired') {
      action = 'Kurangi target produksi atau tingkatkan penjualan dengan promo.';
    } else if (biggestLoss.type === 'reject') {
      action = 'Improve penyimpanan donat jadi, cek suhu display, dan rotate stock lebih sering.';
    }

    recommendations.push({
      id: 'biggest-loss',
      priority: biggestLoss.data.amount > 100000 ? 'high' : 'medium',
      category: 'Rugi',
      title: `${biggestLoss.data.amount > 100000 ? '🚨' : '⚠️'} Fokus: ${biggestLoss.name}`,
      description: `Kategori rugi terbesar (${biggestLoss.data.percentage.toFixed(1)}%) dengan Rp ${biggestLoss.data.amount.toLocaleString('id-ID')}. Mengurangi kategori ini akan impact signifikan.`,
      action,
      icon: TrendingDown,
    });
  }

  // 3. Check sold rate
  if (data.production_sales.sold_rate < 80) {
    const unsold = data.production_sales.success - data.production_sales.sold;
    recommendations.push({
      id: 'low-sold-rate',
      priority: 'medium',
      category: 'Penjualan',
      title: '⚠️ Penjualan Kurang Optimal',
      description: `Hanya ${data.production_sales.sold_rate.toFixed(1)}% terjual (${unsold} pcs masih tersisa). Target: >90%.`,
      action: 'Pertimbangkan promo sore hari, diskon bundle, atau marketing lebih agresif.',
      icon: TrendingDown,
    });
  } else if (data.production_sales.sold_rate > 95) {
    recommendations.push({
      id: 'high-sold-rate',
      priority: 'low',
      category: 'Penjualan',
      title: '✅ Penjualan Sangat Baik!',
      description: `${data.production_sales.sold_rate.toFixed(1)}% terjual! Demand tinggi.`,
      action: 'Pertimbangkan tambah target produksi besok untuk capture demand lebih banyak.',
      icon: TrendingUp,
    });
  }

  // 4. Check production quantity suggestion
  const soldToday = data.production_sales.sold;
  const targetToday = data.production_sales.target;
  const suggestedTarget = Math.round(soldToday * 1.1); // 110% of sold

  if (data.production_sales.sold_rate > 95 && data.production_sales.remaining < 10) {
    recommendations.push({
      id: 'increase-production',
      priority: 'medium',
      category: 'Produksi',
      title: '📈 Saran: Tambah Produksi',
      description: `Demand tinggi (${data.production_sales.sold_rate.toFixed(1)}% terjual). Sisa hanya ${data.production_sales.remaining} pcs.`,
      action: `Pertimbangkan target produksi besok: ${suggestedTarget} pcs (dari ${targetToday} pcs hari ini).`,
      icon: TrendingUp,
    });
  } else if (data.production_sales.sold_rate < 70 && data.production_sales.remaining > 50) {
    const suggestedReduction = Math.round(soldToday * 1.05); // 105% of sold
    recommendations.push({
      id: 'decrease-production',
      priority: 'medium',
      category: 'Produksi',
      title: '📉 Saran: Kurangi Produksi',
      description: `Penjualan rendah (${data.production_sales.sold_rate.toFixed(1)}%). Sisa ${data.production_sales.remaining} pcs terlalu banyak.`,
      action: `Pertimbangkan target produksi besok: ${suggestedReduction} pcs (dari ${targetToday} pcs hari ini).`,
      icon: TrendingDown,
    });
  }

  // 5. Check slow-moving products
  const slowMovers = data.sales_by_product.filter(p => p.percentage < 3 && p.qty > 0);
  if (slowMovers.length > 0) {
    recommendations.push({
      id: 'slow-movers',
      priority: 'low',
      category: 'Produk',
      title: '🐌 Produk Slow-Moving',
      description: `${slowMovers.length} produk dengan penjualan <3%: ${slowMovers.slice(0, 3).map(p => p.product_name).join(', ')}${slowMovers.length > 3 ? ', dll' : ''}.`,
      action: 'Pertimbangkan kurangi produksi produk ini atau buat promo khusus.',
      icon: AlertCircle,
    });
  }

  // 6. Check top performers
  const topPerformers = data.sales_by_product.slice(0, 3);
  if (topPerformers.length > 0) {
    const topPercentage = topPerformers.reduce((sum, p) => sum + p.percentage, 0);
    if (topPercentage > 70) {
      recommendations.push({
        id: 'focus-top-products',
        priority: 'low',
        category: 'Produk',
        title: '⭐ Fokus pada Top Products',
        description: `Top 3 produk menyumbang ${topPercentage.toFixed(1)}% penjualan: ${topPerformers.map(p => p.product_name).join(', ')}.`,
        action: 'Pastikan stok top products selalu cukup dan prioritaskan kualitas produksi mereka.',
        icon: Lightbulb,
      });
    }
  }

  // 7. Check margin
  if (data.financial_summary.margin < 30) {
    recommendations.push({
      id: 'low-margin',
      priority: 'high',
      category: 'Keuangan',
      title: '🚨 Margin Rendah!',
      description: `Margin hanya ${data.financial_summary.margin.toFixed(1)}% (target: >30%). Profitabilitas terancam.`,
      action: 'Review pricing, kurangi waste, dan optimize HPP. Pertimbangkan naik harga atau kurangi biaya.',
      icon: AlertTriangle,
    });
  } else if (data.financial_summary.margin > 50) {
    recommendations.push({
      id: 'excellent-margin',
      priority: 'low',
      category: 'Keuangan',
      title: '✅ Margin Excellent!',
      description: `Margin ${data.financial_summary.margin.toFixed(1)}% sangat baik! Bisnis sehat.`,
      action: 'Pertahankan efisiensi operasional dan kualitas produk.',
      icon: CheckCircle,
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Get priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'low':
        return 'bg-green-50 border-green-300 text-green-900';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            💡 Rekomendasi & Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-lg font-semibold">✅ Semua Berjalan Baik!</p>
              <p className="text-sm mt-2">Tidak ada rekomendasi khusus untuk hari ini.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            💡 Rekomendasi & Insights
          </span>
          <span className="text-sm font-normal text-gray-600">
            {recommendations.length} rekomendasi
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const Icon = rec.icon;
            return (
              <Alert
                key={rec.id}
                className={`${getPriorityColor(rec.priority)} border-2`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm">{rec.title}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${getPriorityBadge(
                            rec.priority
                          )}`}
                        >
                          {rec.category} • {rec.priority === 'high' ? 'Prioritas Tinggi' : rec.priority === 'medium' ? 'Prioritas Sedang' : 'Info'}
                        </span>
                      </div>
                    </div>
                    <AlertDescription className="text-sm">
                      <p className="mb-2">{rec.description}</p>
                      <p className="font-semibold">
                        💡 Action: <span className="font-normal">{rec.action}</span>
                      </p>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>📊 Summary:</strong>{' '}
            {recommendations.filter((r) => r.priority === 'high').length > 0
              ? `${recommendations.filter((r) => r.priority === 'high').length} prioritas tinggi memerlukan perhatian segera.`
              : recommendations.filter((r) => r.priority === 'medium').length > 0
              ? `${recommendations.filter((r) => r.priority === 'medium').length} area perlu improvement.`
              : 'Operasional berjalan baik, pertahankan performa!'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
