import { K, get, set, uid } from './storage';
import { productImages } from './images';
import type { Category, Product, User } from './types';

function mkProduct(
  categoryId: string, catIndex: number,
  name: string, desc: string,
  price: number, hot: boolean, sizes: string[]
): Product {
  return {
    id: uid(), name, description: desc, categoryId,
    gender: 'UNISEX', ageGroup: 'ADULT',
    basePrice: price,
    images: productImages(categoryId, catIndex),
    isHotSeller: hot,
    adminRatingOverride: null,
    variants: sizes.map(s => ({
      id: uid(), size: s, color: 'Black', stock: 20, priceModifier: 0
    }))
  };
}

export function seed(): void {
  if (get(K.SEEDED, false)) return;

  // Preserve existing customer accounts; ensure the admin exists.
  const existing = get<User[]>(K.USERS, []);
  const users: User[] = existing.length ? existing.slice() : [];
  if (!users.some(u => u.email === 'admin@shop.com')) {
    users.push({
      id: uid(), email: 'admin@shop.com', password: 'admin123',
      name: 'Shop Admin', phone: '9999999999', role: 'ADMIN'
    });
  }
  set(K.USERS, users);

  const categories: Category[] = [
    { id: 'shirts',   name: 'Shirts',       gender: 'UNISEX', ageGroup: 'ADULT', emoji: '👔' },
    { id: 'tshirts',  name: 'T-Shirts',     gender: 'UNISEX', ageGroup: 'ADULT', emoji: '👕' },
    { id: 'jeans',    name: 'Jeans',        gender: 'UNISEX', ageGroup: 'ADULT', emoji: '👖' },
    { id: 'hoodies',  name: 'Hoodies',      gender: 'UNISEX', ageGroup: 'ADULT', emoji: '🧥' },
    { id: 'coords',   name: 'Co-ord Sets',  gender: 'UNISEX', ageGroup: 'ADULT', emoji: '🕴️' }
  ];
  set(K.CATEGORIES, categories);

  const products: Product[] = [
    // Shirts
    mkProduct('shirts',  0, 'Oversized Shirt',       'Premium oversized shirt with a relaxed fit and tailored finish.', 999,  true,  ['S','M','L','XL']),
    mkProduct('shirts',  1, 'Denim Overshirt',       'Rugged denim overshirt — layer over anything.',                   1199, true,  ['M','L','XL','XXL']),
    mkProduct('shirts',  2, 'Linen Casual Shirt',    'Breathable linen shirt in a modern relaxed cut.',                 1099, false, ['S','M','L','XL']),

    // T-Shirts
    mkProduct('tshirts', 0, 'Classic White Tee',     'Everyday essential — soft cotton white tee.',                     599,  true,  ['S','M','L','XL','XXL']),
    mkProduct('tshirts', 1, 'Minimal Printed Tee',   'Minimal printed t-shirt in super-soft cotton.',                   749,  true,  ['S','M','L','XL']),
    mkProduct('tshirts', 2, 'Dark Graphic Tee',      'Premium graphic tee, back-print statement piece.',                799,  true,  ['S','M','L','XL','XXL']),
    mkProduct('tshirts', 3, 'Washed Oversized Tee',  'Washed finish, oversized silhouette, ultra-comfort.',             849,  true,  ['S','M','L','XL','XXL']),
    mkProduct('tshirts', 4, 'Chaotic Back Print',    'Premium cotton oversized tee with high-quality back print.',      899,  false, ['S','M','L','XL']),

    // Jeans
    mkProduct('jeans',   0, 'Baggy Jeans',           'Trending baggy fit denim with a clean wash.',                     1299, true,  ['30','32','34','36']),
    mkProduct('jeans',   1, 'Slim Fit Jeans',        'Classic slim-fit jeans in stretch denim.',                        1099, false, ['30','32','34','36']),
    mkProduct('jeans',   2, 'Distressed Denim',      'Rugged distressed denim, statement piece.',                       1499, false, ['30','32','34','36']),

    // Hoodies
    mkProduct('hoodies', 0, 'Classic Grey Hoodie',   'Heavy-weight hoodie with brushed fleece lining.',                 1599, true,  ['S','M','L','XL','XXL']),
    mkProduct('hoodies', 1, 'Streetwear Hoodie',     'Oversized streetwear hoodie with statement print.',               1699, true,  ['S','M','L','XL','XXL']),
    mkProduct('hoodies', 2, 'Zip-up Hoodie',         'Everyday zip-up hoodie in ultra-soft cotton.',                    1799, false, ['S','M','L','XL']),

    // Co-ords
    mkProduct('coords',  0, 'Beige Co-ord Set',      'Premium coordinated set — shirt + trousers in beige.',            2499, true,  ['S','M','L','XL']),
    mkProduct('coords',  1, 'Neutral Co-ord Set',    'Neutral-tone co-ord set with tailored finish.',                   2699, false, ['S','M','L','XL'])
  ];
  set(K.PRODUCTS, products);
  set(K.SEEDED, true);
}
