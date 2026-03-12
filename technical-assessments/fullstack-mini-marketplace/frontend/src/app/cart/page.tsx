"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { ordersApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function CartPage() {
  const { items, remove, updateQty, clear, total } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);

  async function handlePlaceOrder() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setPlacing(true);
    try {
      await ordersApi.create(
        items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      );
      clear();
      toast.success("Order placed successfully!");
      router.push("/orders");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Your cart is empty
        </h1>
        <p className="text-gray-500 mb-6">
          Browse products and add some to your cart.
        </p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cart</h1>

      <ul className="space-y-4 mb-8" aria-label="Cart items">
        {items.map(({ product, quantity }) => (
          <li
            key={product.id}
            className="flex gap-4 bg-white p-4 rounded-lg border border-gray-200"
          >
            <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                  No img
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {product.name}
              </p>
              <p className="text-sm text-gray-500">
                ${Number(product.price).toFixed(2)} each
              </p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateQty(product.id, quantity - 1)}
                  aria-label="Decrease quantity"
                  className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-sm"
                >
                  −
                </button>
                <span className="text-sm font-medium w-6 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => updateQty(product.id, quantity + 1)}
                  disabled={quantity >= product.stock}
                  aria-label="Increase quantity"
                  className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-sm disabled:opacity-40"
                >
                  +
                </button>
                <button
                  onClick={() => remove(product.id)}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="text-right">
              <p className="font-semibold text-gray-900">
                ${(Number(product.price) * quantity).toFixed(2)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-indigo-600">
            ${total.toFixed(2)}
          </span>
        </div>

        {!user && (
          <p className="text-sm text-amber-600 mb-3">
            Please{" "}
            <Link href="/auth/login" className="underline font-medium">
              sign in
            </Link>{" "}
            to place your order.
          </p>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {placing ? "Placing order…" : "Place order"}
        </button>
      </div>
    </div>
  );
}
