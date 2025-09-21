import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Product {
  id: string;
  type: 'book' | 'goods' | 'digital_book';
  title: string;
  creator: {
    name: string;
    age?: number;
    location: string;
    story: string;
  };
  price: number;
  images: string[];
  description: string;
  impact: {
    metric: string;
    value: string;
  };
  stock: number;
  category: string[];
  featured: boolean;
  // Book-specific fields for PDF handling
  bookId?: string;
  pdfKey?: string;
  pdfFrontCover?: string;
  pdfBackCover?: string;
  pageLayout?: string;
  coverImage?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (productId: string) => number;
}

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.product.id === product.id);
          
          if (existingItem) {
            // Update quantity if item already exists
            return {
              items: state.items.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: Math.min(item.quantity + quantity, item.product.stock) }
                  : item
              ),
            };
          }
          
          // Add new item
          return {
            items: [...state.items, { product, quantity: Math.min(quantity, product.stock) }],
          };
        });
      },
      
      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter(item => item.product.id !== productId),
        }));
      },
      
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.product.id === productId
              ? { ...item, quantity: Math.min(quantity, item.product.stock) }
              : item
          ),
        }));
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        const state = get();
        return state.items.reduce((total, item) => total + (Number(item.product.price || 0) * item.quantity), 0);
      },
      
      getItemQuantity: (productId: string) => {
        const state = get();
        const item = state.items.find(item => item.product.id === productId);
        return item ? item.quantity : 0;
      },
    }),
    {
      name: '1001-stories-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useCartStore;