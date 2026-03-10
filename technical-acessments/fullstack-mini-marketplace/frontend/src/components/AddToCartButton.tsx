'use client';

import { useCart } from '@/contexts/CartContext';
import { Product } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AddToCartButton({ product }: { product: Product }) {
  const { add } = useCart();

  function handleAdd() {
    add(product);
    toast.success(`${product.name} added to cart`);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={product.stock === 0}
      className="w-full sm:w-auto bg-indigo-600 text-white py-3 px-8 rounded-md font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      {product.stock === 0 ? 'Out of stock' : 'Add to cart'}
    </button>
  );
}
