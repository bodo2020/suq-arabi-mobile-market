
import { CartItem as BaseCartItem, Product } from "@/lib/supabase";

export type CartItem = BaseCartItem & {
  is_bulk?: boolean;
  unit_of_measure?: string;
  barcode?: string;
};

export type CartContextType = {
  items: CartItem[];
  cart: {
    items: CartItem[];
  };
  addToCart: (product: Product & { 
    price: number; 
    quantity: number; 
    is_bulk?: boolean;
    unit_of_measure?: string;
  }) => void;
  removeFromCart: (productId: string, is_bulk?: boolean) => void;
  updateQuantity: (productId: string, quantity: number, is_bulk?: boolean) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getCartTotal: () => number;
  isInitialized: boolean;
  syncError: string | null;
  isSaving: boolean;
  retrySync: () => void;
};

