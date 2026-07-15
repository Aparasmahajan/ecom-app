export type Role = 'USER' | 'ADMIN';
export type Gender = 'MEN' | 'WOMEN' | 'UNISEX';
export type AgeGroup = 'KIDS' | 'TEEN' | 'ADULT';
export type OrderStatus =
  | 'CREATED' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  gender: Gender;
  ageGroup: AgeGroup;
  emoji: string;
}

export interface Variant {
  id: string;
  size: string;
  color: string;
  stock: number;
  priceModifier: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  gender: Gender;
  ageGroup: AgeGroup;
  basePrice: number;
  images: string[];
  isHotSeller: boolean;
  adminRatingOverride: number | null;
  variants: Variant[];
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  note: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  stars: number;
  comment: string;
  createdAt: number;
}

export interface OrderItemSnapshot {
  productId: string;
  productNameSnapshot: string;
  variantId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  note: string;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  addressId: string;
  addressSnapshot: Address | undefined;
  items: OrderItemSnapshot[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'PENDING' | 'PAID';
  razorpayOrderId: string;
  razorpayPaymentId: string;
  createdAt: number;
}

export interface Session {
  userId: string;
}
