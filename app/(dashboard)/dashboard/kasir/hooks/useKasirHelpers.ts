import { calculateHPPTotal } from '@/lib/utils/pricing';
import type { CartItem, CartSatuanItem } from './useKasirTypes';
import type { ProductWithCategory, ProductBox, OutletChannelPrice } from '@/lib/types';

export interface AutomatedBox {
  box: ProductBox;
  qty: number;
  totalCapacity: number;
  target: string;
  used: number;
}

export const formatRp = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export const getDisplayPrice = (
  p: ProductWithCategory,
  channelPrices: OutletChannelPrice[],
) => {
  const cp = channelPrices.find((c) => c.product_id === p.id);
  return cp ? cp.harga_jual : p.harga_jual;
};

export const calculateGrandTotal = (cart: CartItem[]) =>
  cart.reduce((sum, item) => {
    if (item.type === 'satuan') return sum + item.harga * item.qty;
    if (item.type === 'paket') return sum + item.hargaPaket;
    if (item.type === 'bundling') return sum + item.harga;
    if (item.type === 'custom') return sum + item.totalHarga;
    if (item.type === 'box') return sum + item.harga * item.qty;
    return sum;
  }, 0);

export const calculateCartHPP = (
  cart: CartItem[],
  products: ProductWithCategory[],
) =>
  cart.reduce((sum, item) => {
    if (item.type === 'satuan') {
      const prod = products.find((p) => p.id === item.varianId);
      if (!prod) return sum;
      return sum + calculateHPPTotal(prod) * item.qty;
    }

    if (item.type === 'paket' || item.type === 'custom') {
      return item.isiDonat.reduce((sub, donat) => {
        const prod = products.find((p) => p.id === donat.productId);
        return prod ? sub + calculateHPPTotal(prod) : sub;
      }, sum);
    }

    return sum;
  }, 0);

export const calculateAutomatedBoxes = (
  cart: CartItem[],
  products: ProductWithCategory[],
  boxList: ProductBox[],
) => {
  const list: AutomatedBox[] = [];
  const groupedSatuan: Record<string, number> = {};

  cart.forEach((item) => {
    if (item.type === 'satuan') {
      const prod = products.find((p) => p.id === item.varianId);
      if (prod) {
        const target = prod.ukuran === 'mini' ? 'mini' : 'standar';
        groupedSatuan[target] = (groupedSatuan[target] || 0) + item.qty;
      }
    } else if (item.type === 'custom') {
      const target = item.ukuranDonat === 'mini' ? 'mini' : 'standar';
      groupedSatuan[target] =
        (groupedSatuan[target] || 0) + item.kapasitas;
    }
  });

  for (const target of Object.keys(groupedSatuan)) {
    let remainingQty = groupedSatuan[target];
    if (remainingQty <= 0) continue;

    const suitableBoxes = boxList
      .filter((box) => box.peruntukan === target || box.peruntukan === 'universal')
      .sort((a, b) => b.kapasitas - a.kapasitas);

    if (suitableBoxes.length === 0) continue;

    for (const box of suitableBoxes) {
      if (remainingQty >= box.kapasitas || suitableBoxes.length === 1) {
        const count = Math.floor(remainingQty / box.kapasitas);
        if (count > 0) {
          list.push({
            box,
            qty: count,
            totalCapacity: count * box.kapasitas,
            target,
            used: count * box.kapasitas,
          });
          remainingQty -= count * box.kapasitas;
        }
      }
    }

    if (remainingQty > 0) {
      const bestFitBox = [...suitableBoxes]
        .sort((a, b) => a.kapasitas - b.kapasitas)
        .find((b) => b.kapasitas >= remainingQty);
      if (bestFitBox) {
        const exist = list.find((l) => l.box.id === bestFitBox.id);
        if (exist) {
          exist.qty += 1;
          exist.used += remainingQty;
          exist.totalCapacity += bestFitBox.kapasitas;
        } else {
          list.push({
            box: bestFitBox,
            qty: 1,
            totalCapacity: bestFitBox.kapasitas,
            target,
            used: remainingQty,
          });
        }
        remainingQty = 0;
      } else if (suitableBoxes.length > 0) {
        const box = suitableBoxes[0];
        const exist = list.find((l) => l.box.id === box.id);
        if (exist) {
          exist.qty += 1;
          exist.used += remainingQty;
          exist.totalCapacity += box.kapasitas;
        } else {
          list.push({
            box,
            qty: 1,
            totalCapacity: box.kapasitas,
            target,
            used: remainingQty,
          });
        }
        remainingQty = 0;
      }
    }
  }

  return list.filter((item) => {
    const manualBoxInCart = cart.find(
      (c) => c.type === 'box' && c.boxId === item.box.id,
    );
    return !manualBoxInCart;
  });
};

export const calculateAutomatedBoxTotal = (boxes: AutomatedBox[]) =>
  boxes.reduce((sum, item) => sum + item.box.harga_box * item.qty, 0);

export const calculateMaxCartDiscount = (
  totalBeforeDiscount: number,
  cartHPP: number,
) => Math.max(0, totalBeforeDiscount - cartHPP);

export const getCartQty = (cart: CartItem[], varianId: string) => {
  const item = cart.find(
    (c) => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId,
  ) as CartSatuanItem | undefined;
  return item?.qty || 0;
};

export const getCartSatuanId = (cart: CartItem[], varianId: string) => {
  const item = cart.find(
    (c) => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId,
  ) as CartSatuanItem | undefined;
  return item?.id || null;
};
