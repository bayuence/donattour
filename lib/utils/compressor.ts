import imageCompression from 'browser-image-compression';

/**
 * Mengompresi file gambar secara iteratif agar ukurannya di bawah 100 KB.
 * Jika file sudah di bawah 100 KB atau bukan gambar, file dikembalikan aslinya.
 */
export async function compressImageToMax100KB(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }
  
  if (file.size <= 100 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 0.095, // Target di bawah 100KB (~97KB)
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    let compressedFile = await imageCompression(file, options);
    
    // Jika masih di atas 100KB, lakukan kompresi ulang dengan kualitas lebih rendah
    let iterations = 0;
    while (compressedFile.size > 100 * 1024 && iterations < 3) {
      options.initialQuality -= 0.15;
      options.maxWidthOrHeight = Math.round(options.maxWidthOrHeight * 0.8);
      compressedFile = await imageCompression(compressedFile, options);
      iterations++;
    }
    
    // Jika masih di atas 100KB, gunakan fallback Canvas
    if (compressedFile.size > 100 * 1024) {
      return await compressImageWithCanvas(file);
    }
    
    return compressedFile;
  } catch (error) {
    console.error('browser-image-compression gagal, menggunakan fallback Canvas:', error);
    return compressImageWithCanvas(file);
  }
}

/**
 * Kompresor gambar alternatif menggunakan HTML5 Canvas
 * Menggambar ulang gambar ke canvas dengan resolusi lebih kecil dan mengekspor sebagai JPEG berkualitas rendah
 */
export function compressImageWithCanvas(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Batas maksimal dimensi piksel
        const maxDimension = 1024;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Kembali ke file asli jika canvas tidak didukung
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Iterasi penurunan kualitas
        let quality = 0.7;
        const checkSizeAndResolve = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              // Jika ukuran sudah aman atau kualitas sudah terlalu rendah, selesaikan
              if (blob.size <= 98 * 1024 || q <= 0.15) {
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                const compressedFile = new File([blob], newName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                checkSizeAndResolve(q - 0.15);
              }
            },
            'image/jpeg',
            q
          );
        };
        
        checkSizeAndResolve(quality);
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
