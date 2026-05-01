import type { CustomModeConfig } from '@/lib/types';

// Helper function to calculate HPP for custom donat: HPP Polos + HPP Topping
export const calculateHPPForMode = async (
  modeConfig: CustomModeConfig,
  kapasitas: number,
  ukuranDonat: 'standar' | 'mini',
  categories: { id: string; nama: string }[]
): Promise<{ hpp: number; info: string }> => {
  if (!modeConfig.category_limits || modeConfig.category_limits.length === 0) {
    return { hpp: 0, info: 'Tidak ada kategori dipilih' };
  }

  try {
    console.log('🔍 Debug HPP Calculation (HPP Polos + HPP Topping):');
    console.log('Mode Config:', modeConfig.nama);
    console.log('Kapasitas:', kapasitas);
    console.log('Ukuran Donat:', ukuranDonat);

    // Import getAllProducts to get actual HPP data
    const { getAllProducts } = await import('@/lib/db');
    const allProducts = await getAllProducts();

    console.log('📋 All products found:', allProducts.length);

    // Find products with matching ukuran to get HPP Polos + HPP Topping
    const matchingProducts = allProducts.filter(
      p =>
        p.ukuran === ukuranDonat &&
        p.is_active &&
        ((p.harga_pokok_penjualan || 0) > 0 || p.biaya_topping > 0) // Either HPP or topping must be set
    );

    console.log(`🔍 Products with ukuran "${ukuranDonat}":`, matchingProducts.length);

    if (matchingProducts.length === 0) {
      console.log('❌ No products found with valid data for ukuran:', ukuranDonat);
      return {
        hpp: 0,
        info: `Tidak ada produk ${ukuranDonat} dengan data HPP/Topping yang valid`,
      };
    }

    // Use the first valid product to get HPP structure
    const sampleProduct = matchingProducts[0];
    const hppPolos = sampleProduct.harga_pokok_penjualan || 0; // HPP Polos
    const hppTopping = sampleProduct.biaya_topping || 0; // HPP Topping
    const hppPerDonat = hppPolos + hppTopping; // Total HPP per donat

    console.log(`📊 HPP Calculation from product "${sampleProduct.nama}":`);
    console.log(`- HPP Polos: Rp ${hppPolos.toLocaleString()}`);
    console.log(`- HPP Topping: Rp ${hppTopping.toLocaleString()}`);
    console.log(`- HPP per donat: Rp ${hppPerDonat.toLocaleString()}`);

    // Calculate total HPP for the box
    const totalHPP = kapasitas * hppPerDonat;

    console.log(`📊 Final Calculation:`);
    console.log(`Kapasitas: ${kapasitas} donat`);
    console.log(`HPP per donat: Rp ${hppPerDonat.toLocaleString()}`);
    console.log(
      `Total HPP: ${kapasitas} × Rp ${hppPerDonat.toLocaleString()} = Rp ${totalHPP.toLocaleString()}`
    );

    const info = `HPP Polos: Rp ${hppPolos.toLocaleString()} + HPP Topping: Rp ${hppTopping.toLocaleString()} = Rp ${hppPerDonat.toLocaleString()}/donat`;

    return { hpp: totalHPP, info };
  } catch (error) {
    console.error('Error calculating HPP from database:', error);
    return {
      hpp: 0,
      info: 'Error mengambil data HPP dari database',
    };
  }
};
