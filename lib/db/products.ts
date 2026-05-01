import { supabase } from '../supabase'
import type {
  ProductWithCategory,
  ProductCategory,
  Product,
  ProductBox,
  ProductPackage,
  ProductBundling,
  ProductCustomTemplate,
} from '../types'

// ─── Products ────────────────────────────────────────────────

export async function getProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .order('nama')

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }
  return data ?? []
}

export async function getProductById(productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }
  return data
}

export async function updateProductStock(productId: string, newStock: number) {
  const { error } = await supabase
    .from('products')
    .update({ quantity_in_stock: newStock })
    .eq('id', productId)

  if (error) {
    console.error('Error updating stock:', error)
  }
}

export async function getProductsWithCategory(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching products with category:', error)
    return []
  }
  return data ?? []
}

export async function getProductsByTipe(tipe: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tipe_produk', tipe)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching products by tipe:', error)
    return []
  }
  return data ?? []
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('nama')

  if (error) {
    console.error('Error fetching all products:', error)
    return []
  }
  return data ?? []
}

// ─── Custom Mode Configuration ───────────────────────────────

export async function getCustomModeConfigs() {
  try {
    const { data, error } = await supabase
      .from('custom_mode_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at')

    if (error) {
      console.error('Error fetching custom mode configs:', error)
      // Return empty array if table doesn't exist yet
      return []
    }
    return data ?? []
  } catch (err) {
    console.error('Exception in getCustomModeConfigs:', err)
    return []
  }
}

export async function testInsertModeConfig() {
  try {
    // Test with minimal data first
    const testData = {
      nama: 'Test Simple ' + Date.now(),
      slug: 'test-simple-' + Date.now(),
      tipe_mode: 'flexible',
      category_limits: [],  // Empty array first
      is_active: true
    };

    console.log('Testing minimal insert with data:', testData);

    const { data, error } = await supabase
      .from('custom_mode_config')
      .insert(testData)
      .select();

    if (error) {
      console.error('Test insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // Try even simpler - just required fields
      console.log('Trying with just required fields...');
      const simpleData = {
        nama: 'Simple Test ' + Date.now(),
        slug: 'simple-test-' + Date.now()
      };
      
      const { data: data2, error: error2 } = await supabase
        .from('custom_mode_config')
        .insert(simpleData)
        .select();
        
      if (error2) {
        console.error('Simple test also failed:', error2);
        return { success: false, error: error2 };
      } else {
        console.log('Simple test success:', data2);
        return { success: true, data: data2 };
      }
    }

    console.log('Test insert success:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Test insert exception:', err);
    return { success: false, error: err };
  }
}

export async function upsertCustomModeConfig(modeConfig: any) {
  try {
    console.log('Attempting to upsert mode config:', modeConfig);
    
    if (modeConfig.id) {
      const { error } = await supabase
        .from('custom_mode_config')
        .update(modeConfig)
        .eq('id', modeConfig.id)
      if (error) { 
        console.error('Error updating custom mode config:', error); 
        return false 
      }
    } else {
      // Remove id field for insert
      const { id, ...insertData } = modeConfig;
      console.log('Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('custom_mode_config')
        .insert(insertData)
        .select()
      if (error) { 
        console.error('Error inserting custom mode config:', error); 
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        return false 
      }
      console.log('Successfully inserted:', data);
    }
    return true
  } catch (err) {
    console.error('Unexpected error in upsertCustomModeConfig:', err)
    return false
  }
}

export async function deleteCustomModeConfig(id: string) {
  try {
    const { error } = await supabase
      .from('custom_mode_config')
      .delete()
      .eq('id', id)
    if (error) { console.error('Error deleting custom mode config:', error); return false }
    return true
  } catch (err) {
    console.error('Unexpected error in deleteCustomModeConfig:', err)
    return false
  }
}

export async function upsertProduct(prod: Partial<ProductWithCategory>) {
  const { category, ...baseProd } = prod as any
  void category
  if (baseProd.harga_jual) baseProd.harga_jual = Number(baseProd.harga_jual)
  if (baseProd.harga_pokok_penjualan) baseProd.harga_pokok_penjualan = Number(baseProd.harga_pokok_penjualan)
  if ('biaya_topping' in baseProd) delete baseProd.biaya_topping
  if (!baseProd.category_id) delete baseProd.category_id

  try {
    let finalId = baseProd.id;

    // SMART UPSERT: Jika ID tidak ada, paksa cari berdasarkan Nama, Ukuran, dan Kategori (Analisis A-Z)
    if (!finalId && baseProd.nama && baseProd.ukuran) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('nama', baseProd.nama)
        .eq('ukuran', baseProd.ukuran)
        .eq('category_id', baseProd.category_id || '')
        .eq('is_active', true)
        .maybeSingle();
      
      if (existing) {
        finalId = existing.id;
        console.log(`[SmartUpsert] Menemukan produk existing ID: ${finalId} untuk: ${baseProd.nama}`);
      }
    }

    if (finalId) {
      const { data, error } = await supabase
        .from('products')
        .update({ ...baseProd, id: finalId, updated_at: new Date().toISOString() })
        .eq('id', finalId)
        .select()
        .single()
      if (error) { console.error('Error updating product:', error); return null }
      return data as Product
    } else {
      const kode = baseProd.kode || `PRD-${Date.now().toString().slice(-6)}`
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...baseProd,
          kode,
          quantity_in_stock: baseProd.quantity_in_stock ?? 0,
          reorder_level: baseProd.reorder_level ?? 0,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      if (error) {
        console.error('Error inserting product:', error.message || error, JSON.stringify(error))
        return null
      }
      return data as Product
    }
  } catch (err) {
    console.error('Error upserting product:', err)
    return null
  }
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) { console.error('Error deleting product:', error); return false }
  return true
}

// ─── Categories ──────────────────────────────────────────────

export async function getCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('sort_order')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }
  return data ?? []
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('sort_order')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }
  return data ?? []
}

export async function upsertCategory(cat: Partial<ProductCategory>) {
  try {
    if (cat.id) {
      const { error } = await supabase.from('product_categories').update(cat).eq('id', cat.id)
      if (error) { console.error('Error updating category:', error); return false }
    } else {
      const { error } = await supabase.from('product_categories').insert(cat)
      if (error) { console.error('Error inserting category:', error); return false }
    }
    return true
  } catch { return false }
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('product_categories').delete().eq('id', id)
  if (error) { console.error('Error deleting category:', error); return false }
  return true
}

// ─── Boxes ───────────────────────────────────────────────────

export async function getBoxes(): Promise<ProductBox[]> {
  const { data, error } = await supabase
    .from('product_boxes')
    .select('*')
    .order('kapasitas')

  if (error) { console.error('Error fetching boxes:', error); return [] }
  return data ?? []
}

export async function upsertBox(box: Partial<ProductBox>) {
  try {
    if (box.id) {
      const { error } = await supabase.from('product_boxes').update(box).eq('id', box.id)
      if (error) { console.error('Error updating box:', error); return false }
    } else {
      const { error } = await supabase.from('product_boxes').insert(box)
      if (error) { console.error('Error inserting box:', error); return false }
    }
    return true
  } catch { return false }
}

export async function deleteBox(id: string) {
  const { error } = await supabase.from('product_boxes').delete().eq('id', id)
  if (error) { console.error('Error deleting box:', error); return false }
  return true
}

// ─── Packages ────────────────────────────────────────────────

export async function getPackages(): Promise<ProductPackage[]> {
  const { data, error } = await supabase
    .from('product_packages')
    .select('*, box:product_boxes(*), category:product_categories(*)')
    .order('nama')

  if (error) { console.error('Error fetching packages:', error); return [] }
  return (data ?? []).map((p: any) => ({
    ...p,
    kapasitas: p.box?.kapasitas || 0,
  }))
}

export async function upsertPackage(pkg: Partial<ProductPackage>) {
  // Strip joined/computed fields that shouldn't be sent to DB
  const { box, category, kapasitas, ...data } = pkg as any;
  void box; void category; void kapasitas;
  if (!data.category_id) delete data.category_id;
  if (!data.box_id) delete data.box_id;
  // Ensure JSONB fields are proper objects (not strings)
  if (data.channel_prices === undefined) data.channel_prices = {};
  if (data.allowed_extras === undefined) data.allowed_extras = [];
  if (data.diskon_persen === undefined) data.diskon_persen = 0;
  if (data.diskon_nominal === undefined) data.diskon_nominal = 0;
  try {
    if (data.id) {
      const { error } = await supabase.from('product_packages').update(data).eq('id', data.id)
      if (error) { console.error('Error updating package:', error); return false }
    } else {
      const { error } = await supabase.from('product_packages').insert(data)
      if (error) { console.error('Error inserting package:', error); return false }
    }
    return true
  } catch { return false }
}

export async function getProductPackages(): Promise<ProductPackage[]> {
  const { data, error } = await supabase
    .from('product_packages')
    .select('*, box:product_boxes(*), category:product_categories(*)')
    .eq('is_active', true)
    .order('nama')

  if (error) { console.error('Error fetching product packages:', error); return [] }
  return (data ?? []).map((p: any) => ({
    ...p,
    kapasitas: p.box?.kapasitas || 0,
  }))
}

export async function deletePackage(id: string) {
  const { error } = await supabase.from('product_packages').delete().eq('id', id)
  if (error) { console.error('Error deleting package:', error); return false }
  return true
}

// ─── Bundlings ───────────────────────────────────────────────

export async function getBundlings(): Promise<ProductBundling[]> {
  const { data, error } = await supabase
    .from('product_bundling')
    .select('*')
    .order('nama')

  if (error) { console.error('Error fetching bundlings:', error); return [] }
  return data ?? []
}

export async function upsertBundling(bundling: Partial<ProductBundling>) {
  try {
    if (bundling.id) {
      const { error } = await supabase.from('product_bundling').update(bundling).eq('id', bundling.id)
      if (error) { console.error('Error updating bundling:', error); return false }
    } else {
      const { error } = await supabase.from('product_bundling').insert(bundling)
      if (error) { console.error('Error inserting bundling:', error); return false }
    }
    return true
  } catch { return false }
}

export async function getProductBundlings(): Promise<ProductBundling[]> {
  const { data, error } = await supabase
    .from('product_bundling')
    .select('*')
    .eq('is_active', true)
    .order('nama')

  if (error) { console.error('Error fetching product bundlings:', error); return [] }
  return data ?? []
}

// ─── Custom Templates ────────────────────────────────────────

export async function getCustomTemplates(): Promise<ProductCustomTemplate[]> {
  const { data, error } = await supabase
    .from('product_custom_templates')
    .select('*')
    .order('kapasitas')

  if (error) { console.error('Error fetching custom templates:', error); return [] }
  return data ?? []
}

export async function upsertCustomTemplate(template: Partial<ProductCustomTemplate>) {
  try {
    if (template.id) {
      const { error } = await supabase
        .from('product_custom_templates')
        .update(template)
        .eq('id', template.id)
      if (error) { console.error('Error updating custom template:', error); return false }
    } else {
      const { error } = await supabase
        .from('product_custom_templates')
        .insert(template)
      if (error) { console.error('Error inserting custom template:', error); return false }
    }
    return true
  } catch (err) {
    console.error('Unexpected error in upsertCustomTemplate:', err)
    return false
  }
}

export async function getProductCustomTemplates(): Promise<ProductCustomTemplate[]> {
  const { data, error } = await supabase
    .from('product_custom_templates')
    .select('*')
    .eq('is_active', true)
    .order('nama')

  if (error) { console.error('Error fetching product custom templates:', error); return [] }
  return data ?? []
}
export async function deleteCustomTemplate(id: string) {
  const { error } = await supabase.from('product_custom_templates').delete().eq('id', id)
  if (error) { console.error('Error deleting custom template:', error); return false }
  return true
}
