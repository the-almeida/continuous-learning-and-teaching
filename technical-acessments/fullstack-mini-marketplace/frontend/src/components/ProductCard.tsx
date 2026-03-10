'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();

  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/products/${product.id}`} className="block relative h-48 bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No image
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.id}`}>
          <h2 className="font-semibold text-gray-900 hover:text-indigo-600 line-clamp-1">
            {product.name}
          </h2>
        </Link>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{product.description}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-indigo-600">${Number(product.price).toFixed(2)}</span>
          <span className="text-xs text-gray-400">{product.category}</span>
        </div>

        <button
          onClick={() => add(product)}
          disabled={product.stock === 0}
          className="mt-3 w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {product.stock === 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}