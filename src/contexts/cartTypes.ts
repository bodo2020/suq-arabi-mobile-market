
import { CartItem as BaseCartItem, Product } from "@/lib/supabase";

export type CartItem = BaseCartItem & {
  is_bulk?: boolean;
  unit_of_measure?: string;
};

export type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product & { 
    price: number; 
    quantity: number; 
    is_bulk?: boolean;
    unit_of_measure?: string;
  }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, is_bulk?: boolean) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
};
