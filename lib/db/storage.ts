import { supabase } from '../supabase'
import { compressImageToMax100KB } from '../utils/compressor'

/**
 * Mengunggah file ke Supabase Storage dan mengembalikan URL publiknya.
 * Bucket default: 'products'
 */
export async function uploadProductImage(file: File, bucket: string = 'products'): Promise<string | null> {
  try {
    // 1. Kompresi gambar menjadi maksimal ~100kb sebelum upload
    let fileToUpload = file;
    if (file.size > 100 * 1024) { // Lebih dari 100 KB
      try {
        const imageCompression = (await import('browser-image-compression')).default;
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 0.1, // Target max 100 KB
          maxWidthOrHeight: 1200, // Ukuran ideal yang aman untuk kualitas dan kompresi
          useWebWorker: true, // Biar ga bikin lag/freezing pada browser
          initialQuality: 0.8,
        });
      } catch (cErr) {
        console.error('Kompresi gambar gagal, menggunakan ukuran asli:', cErr);
      }
    }

    // 2. Buat nama file unik (misal: strawberry-glazed-1712345678.png)
    // Apabila sudah terkompres, defaultnya adalah jpeg/webp
    const fileExt = fileToUpload.name.split('.').pop() || 'jpeg';
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `images/${fileName}`

    // 3. Unggah file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload)

    if (uploadError) {
      console.error('Error uploading image to storage:', uploadError)
      return null
    }

    // 3. Dapatkan URL Publik
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (err) {
    console.error('Unexpected error during image upload:', err)
    return null
  }
}

/**
 * Menghapus file dari Supabase Storage.
 */
export async function deleteProductImage(url: string, bucket: string = 'products'): Promise<boolean> {
  try {
    if (!url || !url.includes(bucket)) return false
    
    // Ekstrak path dari URL (misal: images/xyz-123.png)
    const urlParts = url.split(`${bucket}/`)
    if (urlParts.length < 2) return false
    
    const filePath = urlParts[1]
    const { error } = await supabase.storage.from(bucket).remove([filePath])
    
    return !error
  } catch {
    return false
  }
}

/**
 * Mengunggah file bukti pengeluaran ke Supabase Storage (bucket 'products' atau 'expenses').
 * File gambar akan dikompresi di bawah 100KB terlebih dahulu menggunakan compressor engine kita.
 */
export async function uploadExpenseFile(file: File, bucket: string = 'products'): Promise<string | null> {
  try {
    let fileToUpload = file;
    
    // 1. Jika gambar, lakukan kompresi ketat hingga di bawah 100KB
    if (file.type.startsWith('image/')) {
      fileToUpload = await compressImageToMax100KB(file);
    }
    
    // 2. Buat nama file unik
    const fileExt = fileToUpload.name.split('.').pop() || 'jpeg';
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    // Simpan di subfolder 'receipts' agar rapi
    const filePath = `receipts/${fileName}`;

    // 3. Unggah file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload);

    if (uploadError) {
      console.error('Error uploading expense file to storage:', uploadError);
      return null;
    }

    // 4. Dapatkan URL Publik
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error during expense file upload:', err);
    return null;
  }
}
