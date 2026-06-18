import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deductStockOnSale } from "@/lib/db/production-tracking";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outletId, channelKey, ukuran, kategori, qty, catatan } = body;

    if (!outletId || !channelKey || !ukuran || !kategori || !qty) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Potong stok donat non-topping
    const deductResult = await deductStockOnSale(outletId, ukuran, qty, supabase);
    if (!deductResult.success) {
      return NextResponse.json({ success: false, error: deductResult.error }, { status: 400 });
    }

    // 2. Catat riwayat pemotongan ke channel_stock_deductions
    const { data: record, error: recordError } = await (supabase as any)
      .from('channel_stock_deductions')
      .insert({
        outlet_id: outletId,
        channel_key: channelKey,
        ukuran,
        kategori,
        qty,
        catatan: catatan || null
      })
      .select()
      .single();

    if (recordError) {
      console.error("Gagal mencatat riwayat channel_stock_deductions:", recordError);
      // We still return success because stock was successfully deducted
      return NextResponse.json({ 
        success: true, 
        warning: "Stok terpotong tetapi gagal mencatat riwayat", 
        data: deductResult 
      });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Error di channel-sales/create API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
