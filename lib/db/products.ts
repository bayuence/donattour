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

export async function upsertProduct(prod: Partial<ProductWithCategory>) {
  const { category, ...baseProd } = prod as any
  void category
  if (baseProd.harga_jual) baseProd.harga_jual = Number(baseProd.harga_jual)
  if (baseProd.harga_pokok_penjualan) baseProd.harga_pokok_penjualan = Number(baseProd.harga_pokok_penjualan)
  if ('biaya_topping' in baseProd) delete baseProd.biaya_topping
  if (!baseProd.category_id) delete baseProd.category_id

  try {
    if (baseProd.id) {
      const { error } = await supabase
        .from('products')
        .update(baseProd)
        .eq('id', baseProd.id)
      if (error) { console.error('Error updating product:', error); return false }
    } else {
      const kode = baseProd.kode || `PRD-${Date.now().toString().slice(-6)}`
      const { error } = await supabase
        .from('products')
        .insert({
          ...baseProd,
          kode,
          quantity_in_stock: baseProd.quantity_in_stock ?? 0,
          reorder_level: baseProd.reorder_level ?? 0,
        })
      if (error) {
        console.error('Error inserting product:', error.message || error, JSON.stringify(error))
        return false
      }
    }
    return true
  } catch (err) {
    console.error('Error upserting product:', err)
    return false
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
    .order('nama')

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
    .order('nama')

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
  if (!pkg.category_id) delete pkg.category_id
  if (!pkg.box_id) delete pkg.box_id
  try {
    if (pkg.id) {
      const { error } = await supabase.from('product_packages').update(pkg).eq('id', pkg.id)
      if (error) { console.error('Error updating package:', error); return false }
    } else {
      const { error } = await supabase.from('product_packages').insert(pkg)
      if (error) { console.error('Error inserting package:', error); return false }
    }
    return true
  } catch { return false }
}

export async function getProductPackages(): Promise<ProductPackage[]> {
  const { data, error } = await supabase
    .from('product_packages')
    .select('*')
    .eq('is_active', true)
    .order('nama')

  if (error) { console.error('Error fetching product packages:', error); return [] }
  return data ?? []
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
      const { error } = await supabase.from('product_custom_templates').update(template).eq('id', template.id)
      if (error) { console.error('Error updating custom template:', error); return false }
    } else {
      const { error } = await supabase.from('product_custom_templates').insert(template)
      if (error) { console.error('Error inserting custom template:', error); return false }
    }
    return true
  } catch { return false }
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
