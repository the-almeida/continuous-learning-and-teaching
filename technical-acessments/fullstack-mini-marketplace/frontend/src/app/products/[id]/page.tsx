import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';
import { Product } from '@/lib/api';

const BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchProduct(id: string): Promise<Product | null> {
  const res = await fetch(`${BASE}/api/products/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id);
  if (!product) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">
        &larr; Back to products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative h-80 md:h-full min-h-64 bg-gray-100 rounded-lg overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No image</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className="inline-block text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded mb-2">
              {product.category}
            </span>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          </div>

          <p className="text-3xl font-bold text-indigo-600">${Number(product.price).toFixed(2)}</p>

          {product.description && (
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          )}

          <p className="text-sm text-gray-500">
            {product.stock > 0 ? (
              <span className="text-green-600 font-medium">{product.stock} in stock</span>
            ) : (
              <span className="text-red-500 font-medium">Out of stock</span>
            )}
          </p>

          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
