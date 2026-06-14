import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { validateAndDeductStock, deductStockOnSale } from "@/lib/db/production-tracking";
import { syncTransactionToSheets } from "@/lib/integrations/google-sheets";
import { apiLogger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get("x-correlation-id") || "no-id";
  const startTime = Date.now();
  const userId = request.headers.get("x-user-id") || "system";

  try {
    apiLogger.info({
      correlationId,
      event: "order_create_start",
      userId,
      timestamp: new Date().toISOString(),
    });

    const body = await request.json();
    const { orderData, items, outletId } = body;

    if (!orderData || !outletId) {
      apiLogger.warn({
        correlationId,
        event: "order_create_validation_error",
        error: "Missing required fields",
        provided: Object.keys(body),
      });
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    // ✅ WIB timestamp (UTC+7) agar jam transaksi sesuai waktu Indonesia
    const nowUTC = new Date();
    const nowWIB = new Date(
      nowUTC.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
    );
    const year = nowWIB.getFullYear();
    const month = String(nowWIB.getMonth() + 1).padStart(2, "0");
    const day = String(nowWIB.getDate()).padStart(2, "0");
    const hh = String(nowWIB.getHours()).padStart(2, "0");
    const mm = String(nowWIB.getMinutes()).padStart(2, "0");
    const ss = String(nowWIB.getSeconds()).padStart(2, "0");
    const now = `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;

    // 1. Insert order
    const orderInsert: any = {
      outlet_id: orderData.outlet_id,
      customer_name: orderData.customer_name || "Umum",
      total_amount: orderData.total_amount,
      payment_method: orderData.payment_method,
      payment_method_detail:
        orderData.payment_method_name ||
        (orderData.payment_method === "cash" ? "Tunai" : orderData.payment_method),
      channel: orderData.channel || "toko",
      paid_amount: orderData.paid_amount,
      change_amount: orderData.change_amount,
      status: "completed",
      payment_status: "paid",
      created_at: now,
    };

    if (orderData.kasir_id) orderInsert.kasir_id = orderData.kasir_id;

    const { data: order, error: orderError } = await (supabase as any)
      .from("orders")
      .insert(orderInsert)
      .select()
      .single();

    if (orderError) {
      apiLogger.error({
        correlationId,
        event: "order_create_db_error",
        error: orderError.message,
        code: orderError.code,
      });
      return NextResponse.json(
        { success: false, error: orderError.message },
        { status: 500 },
      );
    }

    apiLogger.info({
      correlationId,
      event: "order_created",
      orderId: order.id,
      outletId: order.outlet_id,
      totalAmount: order.total_amount,
      itemsCount: items?.length || 0,
    });

    // 2. Insert order items
    // ✅ Dideklarasikan di sini agar blok stock deduction bisa mengaksesnya
    const orderItems: any[] = [];

    if (items && items.length > 0) {
      for (const item of items) {
        let productName = item.product_name || item.nama || "";

        // If product_name is empty but product_id exists, fetch from database
        if (!productName && item.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("nama")
            .eq("id", item.product_id)
            .single();

          if (product) {
            productName = product.nama;
          }
        }

        orderItems.push({
          order_id: order.id,
          product_id: item.product_id || null,
          product_name: productName,
          quantity: item.quantity || item.qty || 1,
          unit_price: item.unit_price || item.harga || 0,
          subtotal: item.subtotal || 0,
        });
      }

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error saving order items:", itemsError);
      }
    }

    // 3. Deduct inventory stock
    const stockWarnings: string[] = [];
    const stockDeducted = { standar: 0, mini: 0 };
    try {
      const qtyNeeded = { standar: 0, mini: 0 };

      // ✅ BATCH QUERY: ambil semua produk sekaligus — 1 query, bukan N query
      // ⚠️  Tidak pakai is_donat agar tidak bergantung pada schema cache Supabase
      //     Deteksi donat via tipe_produk + ukuran saja (selalu ada)
      const productIds = [
        ...new Set(orderItems.map((oi: any) => oi.product_id).filter(Boolean)),
      ] as string[];

      if (productIds.length > 0) {
        const { data: prodsData, error: prodsError } = await supabase
          .from("products")
          .select("id, ukuran, tipe_produk, nama") // ← tidak pakai is_donat
          .in("id", productIds);

        if (prodsError) {
          // Log error tapi jangan stop order — deduction di-skip
          apiLogger.error({
            correlationId,
            event: "stock_products_fetch_error",
            error: prodsError.message,
            code: prodsError.code,
            orderId: order.id,
          });
        } else if (prodsData) {
          const productMap = new Map(prodsData.map((p: any) => [p.id, p]));

          for (const oi of orderItems) {
            const prod = productMap.get(oi.product_id);
            if (!prod) continue;

            // Deteksi donat via tipe_produk (tidak bergantung kolom baru)
            const isDonat =
              prod.tipe_produk &&
              (prod.tipe_produk === "donat_varian" ||
                prod.tipe_produk === "donat_base" ||
                prod.tipe_produk.toLowerCase().includes("donat"));

            // Jika donat atau punya ukuran standar/mini → kurangi stok
            if (
              isDonat ||
              (prod.ukuran &&
                (prod.ukuran === "standar" || prod.ukuran === "mini"))
            ) {
              const isMini =
                prod.ukuran === "mini" ||
                (prod.nama && prod.nama.toLowerCase().includes("mini"));
              qtyNeeded[isMini ? "mini" : "standar"] += oi.quantity || 1;
            }
          }

          apiLogger.info({
            correlationId,
            event: "stock_qty_calculated",
            qtyNeeded,
            orderId: order.id,
          });
        }
      }

      // Potong stok untuk standar & mini SECARA PARALEL (lebih cepat)
      const deductTasks = (["standar", "mini"] as const)
        .filter(ukuran => qtyNeeded[ukuran] > 0)
        .map(ukuran => {
          apiLogger.info({
            correlationId,
            event: "stock_deduction_attempt",
            outletId: orderData.outlet_id,
            size: ukuran,
            quantity: qtyNeeded[ukuran],
          });
          return deductStockOnSale(
            orderData.outlet_id,
            ukuran,
            qtyNeeded[ukuran],
            supabase,
          ).then(res => ({ ukuran, res }));
        });

      const deductResults = await Promise.all(deductTasks);

      for (const { ukuran, res } of deductResults) {
        if (!res.success) {
          stockWarnings.push(`⚠️ Gagal memotong stok ${ukuran}: ${res.error}`);
          apiLogger.warn({
            correlationId,
            event: "stock_deduction_failed",
            outletId: orderData.outlet_id,
            size: ukuran,
            error: res.error,
          });
          console.warn(`⚠️ [ORDER ${order.id}] Gagal kurangi stok ${ukuran}: ${res.error}`);
        } else {
          // Cek jika terjadi oversell (discrepancy) yang men-trigger stok negatif
          const oversellRecord = res.deducted?.find((d: any) => d.is_oversell);
          if (oversellRecord) {
            stockWarnings.push(`⚠️ Terjadi selisih! Stok ${ukuran} kurang sebanyak ${oversellRecord.deducted_qty} pcs dan telah disesuaikan menjadi minus (-). Mohon segera input produksi!`);
          }

          stockDeducted[ukuran] = qtyNeeded[ukuran];
          apiLogger.info({
            correlationId,
            event: "stock_deduction_success",
            outletId: orderData.outlet_id,
            size: ukuran,
            deducted: res.deducted,
          });
          console.log(`✅ [ORDER ${order.id}] Stok ${ukuran} berhasil dikurangi ${qtyNeeded[ukuran]} pcs`);
        }
      }
    } catch (stockErr: any) {
      apiLogger.error({
        correlationId,
        event: "stock_deduction_error",
        error: stockErr.message,
        orderId: order.id,
      });
    }

    // 4. Sync to Google Sheets — NON-BLOCKING total, tidak menahan response
    // Outlet & kasir name fetch juga async agar tidak menambah latency
    Promise.resolve().then(async () => {
      try {
        // Get outlet & kasir name secara paralel (non-blocking)
        const outletResult = await supabase
          .from("outlets")
          .select("nama")
          .eq("id", orderData.outlet_id)
          .single();

        let kasirName = orderData.kasir_name || "";
        if (!kasirName && orderData.kasir_id) {
          const kasirResult = await supabase
            .from("users")
            .select("name")
            .eq("id", orderData.kasir_id)
            .single();
          if (kasirResult.data)
            kasirName = (kasirResult.data as any).name || "";
        }

        // Prepare transaction data for Google Sheets
        const transactionData = {
          order_id: order.id,
          outlet_id: order.outlet_id,
          outlet_name: (outletResult as any)?.data?.nama || "Unknown",
          kasir_id: order.kasir_id || "",
          kasir_name: kasirName,
          customer_name: order.customer_name || "-",
          customer_phone: orderData.customer_phone || "-",
          channel: order.channel,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          status: order.status,
          items: orderItems.map((item: any) => ({
            product_name: item.product_name || "",
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            subtotal: item.subtotal || 0,
          })),
          created_at: order.created_at,
        };

        // Sync to Google Sheets (non-blocking)
        apiLogger.info({
          correlationId,
          event: "sheets_sync_start",
          orderId: transactionData.order_id,
          outletName: transactionData.outlet_name,
          kasirName: transactionData.kasir_name,
          itemsCount: transactionData.items.length,
        });

        syncTransactionToSheets(transactionData)
          .then((success) => {
            if (success) {
              apiLogger.info({
                correlationId,
                event: "sheets_sync_success",
                orderId: transactionData.order_id,
              });
            } else {
              apiLogger.warn({
                correlationId,
                event: "sheets_sync_failed",
                orderId: transactionData.order_id,
              });
            }
          })
          .catch((err: any) => {
            apiLogger.error({
              correlationId,
              event: "sheets_sync_error",
              orderId: transactionData.order_id,
              error: err.message,
            });
          });
      } catch (syncErr: any) {
        apiLogger.error({
          correlationId,
          event: "sheets_sync_exception",
          error: syncErr.message,
          orderId: order.id,
        });
      }
    }); // end Promise.resolve().then — non-blocking

    const duration = Date.now() - startTime;
    apiLogger.info({
      correlationId,
      event: "order_create_success",
      orderId: order.id,
      duration,
      totalAmount: order.total_amount,
    });

    return NextResponse.json({ 
      success: true, 
      data: order,
      warnings: stockWarnings.length > 0 ? stockWarnings : undefined,
      stockDeducted
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({
      correlationId,
      event: "order_create_error",
      error: error.message,
      stack: error.stack,
      duration,
    });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
