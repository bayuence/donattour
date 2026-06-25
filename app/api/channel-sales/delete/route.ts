import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID tidak ditemukan" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Ambil data record channel deduction yang ingin dihapus
    const { data: record, error: fetchError } = await (supabase as any)
      .from('channel_stock_deductions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !record) {
      console.error("Gagal mengambil data channel_stock_deductions:", fetchError);
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const { outlet_id, ukuran, qty, created_at } = record;
    // Ambil tanggal produksi dari created_at (YYYY-MM-DD)
    const productionDate = created_at ? created_at.substring(0, 10) : new Date().toISOString().substring(0, 10);

    // 2. Cari record stok non-topping hari tersebut untuk dikembalikan
    const { data: stockRecords, error: stockFetchError } = await supabase
      .from('inventory_non_topping')
      .select('*')
      .eq('outlet_id', outlet_id)
      .eq('ukuran', ukuran)
      .eq('status', 'fresh')
      .eq('production_date', productionDate)
      .order('qty_available', { ascending: false });

    if (stockFetchError) {
      console.error("Gagal mencari record stok non-topping:", stockFetchError);
    }

    if (stockRecords && stockRecords.length > 0) {
      // Tambahkan kembali kuantitas ke record stock pertama
      const targetStock = stockRecords[0];
      const newQty = targetStock.qty_available + qty;

      console.log(`🔄 [RESTORE STOCK] Menambahkan kembali ${qty} pcs ke batch ${targetStock.id} | ${targetStock.qty_available} -> ${newQty}`);
      
      const { error: updateError } = await supabase
        .from('inventory_non_topping')
        .update({
          qty_available: newQty,
          last_updated: new Date().toISOString()
        })
        .eq('id', targetStock.id);

      if (updateError) {
        console.error("Gagal menambahkan stok non-topping:", updateError);
        return NextResponse.json({ success: false, error: "Gagal mengembalikan stok ke inventory" }, { status: 500 });
      }
    } else {
      // Jika record stok hari itu tidak ada (misalnya terhapus), buat record baru untuk menampung pengembalian
      console.log(`🆕 [RESTORE STOCK] Membuat record stok fresh baru untuk menampung pengembalian ${qty} pcs`);
      const { error: insertError } = await supabase
        .from('inventory_non_topping')
        .insert({
          outlet_id,
          ukuran,
          qty_available: qty,
          production_date: productionDate,
          status: 'fresh',
          last_updated: new Date().toISOString()
        });

      if (insertError) {
        console.error("Gagal membuat record stok baru:", insertError);
        return NextResponse.json({ success: false, error: "Gagal mencatat pengembalian stok baru" }, { status: 500 });
      }
    }

    // 3. Hapus data dari channel_stock_deductions
    const { error: deleteError } = await (supabase as any)
      .from('channel_stock_deductions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("Gagal menghapus riwayat channel_stock_deductions:", deleteError);
      return NextResponse.json({ success: false, error: "Gagal menghapus riwayat transaksi" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Stok berhasil dikembalikan dan riwayat dihapus" });
  } catch (error: any) {
    console.error("Error di channel-sales/delete API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
