"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Product } from "@/lib/api";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const STORAGE_KEY = "cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from localStorage on mount; sync across tabs
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setItems(JSON.parse(stored));

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setItems(e.newValue ? JSON.parse(e.newValue) : []);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function save(next: CartItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setItems(next);
  }

  function add(product: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const next = existing
        ? prev.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
              : i,
          )
        : [...prev, { product, quantity: 1 }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function remove(productId: string) {
    save(items.filter((i) => i.product.id !== productId));
  }

  function updateQty(productId: string, quantity: number) {
    if (quantity < 1) return remove(productId);
    save(
      items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    );
  }

  function clear() {
    save([]);
  }

  const total = items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0,
  );
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, add, remove, updateQty, clear, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
