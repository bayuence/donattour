import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ClosingForm } from './components/ClosingForm';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB

export const metadata: Metadata = {
  title: 'Closing Harian | Donattour',
  description: 'Input closing harian dan laporan rugi',
};

interface ClosingPageProps {
  searchParams: Promise<{
    outlet_id?: string;
    tanggal?: string;
  }>;
}

export default async function ClosingPage({
  searchParams,
}: ClosingPageProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get outlet_id and tanggal from query params
  const params = await searchParams;
  const outletId = params.outlet_id;
  const tanggal = params.tanggal || getTodayWIB(); // ✅ WIB bukan UTC

  // Validate outlet_id
  if (!outletId) {
    redirect('/dashboard');
  }

  // Fetch outlet data
  const { data: outlet, error: outletError } = await supabase
    .from('outlets')
    .select('id, nama')
    .eq('id', outletId)
    .single();

  if (outletError || !outlet) {
    redirect('/dashboard');
  }

  // Check if already closed today
  const { data: existingClosing } = await supabase
    .from('daily_closing')
    .select('id')
    .eq('outlet_id', outletId)
    .eq('tanggal', tanggal)
    .single();

  if (existingClosing) {
    redirect(`/dashboard/closing/view?closing_id=${existingClosing.id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Closing Harian</h1>
        <p className="text-gray-600 mt-2">
          Input status sisa donat dan generate laporan rugi harian
        </p>
      </div>

      {/* Closing Form */}
      <ClosingForm
        outletId={outletId}
        outletName={outlet.nama}
        tanggal={tanggal}
      />
    </div>
  );
}
