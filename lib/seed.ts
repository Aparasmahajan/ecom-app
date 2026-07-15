import { K, get, set, uid } from './storage';
import type { Category, Product, User } from './types';

const img = (s: string) => `https://picsum.photos/seed/${s}/500/500`;

function mkProduct(
  name: string, desc: string, categoryId: string,
  gender: Product['gender'], ageGroup: Product['ageGroup'],
  price: number, hot: boolean, seedStr: string, sizes: string[]
): Product {
  return {
    id: uid(), name, description: desc, categoryId, gender, ageGroup,
    basePrice: price,
    images: [img(seedStr), img(seedStr + 'a'), img(seedStr + 'b')],
    isHotSeller: hot,
    adminRatingOverride: null,
    variants: sizes.map(s => ({
      id: uid(), size: s, color: 'Default', stock: 20, priceModifier: 0
    }))
  };
}

export function seed(): void {
  if (get(K.SEEDED, false)) return;

  const users: User[] = [{
    id: uid(), email: 'admin@shop.com', password: 'admin123',
    name: 'Shop Admin', phone: '9999999999', role: 'ADMIN'
  }];
  set(K.USERS, users);

  const categories: Category[] = [
    { id: 'c1', name: 'Men', gender: 'MEN', ageGroup: 'ADULT', emoji: '👔' },
    { id: 'c2', name: 'Women', gender: 'WOMEN', ageGroup: 'ADULT', emoji: '👗' },
    { id: 'c3', name: 'Kids', gender: 'UNISEX', ageGroup: 'KIDS', emoji: '🧒' },
    { id: 'c4', name: 'Teens', gender: 'UNISEX', ageGroup: 'TEEN', emoji: '🎒' }
  ];
  set(K.CATEGORIES, categories);

  const products: Product[] = [
    mkProduct('Classic Cotton Shirt', 'Hand-stitched premium cotton shirt, tailored fit.', 'c1', 'MEN', 'ADULT', 1499, true, 'shirt1', ['S','M','L','XL']),
    mkProduct('Linen Kurta', 'Breathable linen kurta with custom embroidery.', 'c1', 'MEN', 'ADULT', 2199, true, 'kurta1', ['M','L','XL','XXL']),
    mkProduct('Formal Trousers', 'Slim-fit formal trousers with pleated finish.', 'c1', 'MEN', 'ADULT', 1799, false, 'trouser1', ['30','32','34','36']),
    mkProduct('Silk Saree', 'Handwoven silk saree with zari border.', 'c2', 'WOMEN', 'ADULT', 4999, true, 'saree1', ['Free']),
    mkProduct('Anarkali Dress', 'Elegant anarkali dress with detailed threadwork.', 'c2', 'WOMEN', 'ADULT', 3499, true, 'dress1', ['S','M','L','XL']),
    mkProduct('Cotton Kurti', 'Everyday cotton kurti, custom-fitted.', 'c2', 'WOMEN', 'ADULT', 899, false, 'kurti1', ['S','M','L','XL']),
    mkProduct('Kids Party Frock', 'Colorful frock for special occasions.', 'c3', 'UNISEX', 'KIDS', 999, true, 'frock1', ['2-3Y','4-5Y','6-7Y']),
    mkProduct('School Uniform Set', 'Durable uniform set with custom sizing.', 'c3', 'UNISEX', 'KIDS', 1299, false, 'uniform1', ['5-6Y','7-8Y','9-10Y']),
    mkProduct('Teen Denim Jacket', 'Trendy denim jacket for teens.', 'c4', 'UNISEX', 'TEEN', 1899, true, 'jacket1', ['S','M','L']),
    mkProduct('Streetwear Hoodie', 'Comfortable oversized hoodie.', 'c4', 'UNISEX', 'TEEN', 1599, false, 'hoodie1', ['S','M','L','XL'])
  ];
  set(K.PRODUCTS, products);
  set(K.SEEDED, true);
}
