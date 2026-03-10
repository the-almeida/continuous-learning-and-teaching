import { Suspense } from 'react';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import SearchFilters from '@/components/SearchFilters';
import { ProductsResponse } from '@/lib/api';

const BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchProducts(searchParams: Record<string, string>): Promise<ProductsResponse> {
  const { page = '1', limit = '12', category, search, sortBy = 'createdAt', order = 'DESC' } =
    searchParams;

  const params = new URLSearchParams({ page, limit, sortBy, order });
  if (category) params.set('category', category);
  if (search) params.set('search', search);

  const res = await fetch(`${BASE}/api/products?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  let data: ProductsResponse;
  try {
    data = await fetchProducts(searchParams);
  } catch {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-medium">Failed to load products. Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Products</h1>

      <Suspense fallback={<div className="h-12 bg-gray-100 rounded animate-pulse mb-6" />}>
        <SearchFilters />
      </Suspense>

      {data.items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No products found.</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Showing {data.items.length} of {data.total} products
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} searchParams={searchParams} />
        </>
      )}
    </div>
  );
}
