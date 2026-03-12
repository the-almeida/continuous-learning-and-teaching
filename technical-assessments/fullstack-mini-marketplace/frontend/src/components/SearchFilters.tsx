"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

const CATEGORIES = ["Electronics", "Clothing", "Books"];

const SORT_OPTIONS = [
  { label: "Newest", sortBy: "createdAt", order: "DESC" },
  { label: "Price: Low to High", sortBy: "price", order: "ASC" },
  { label: "Price: High to Low", sortBy: "price", order: "DESC" },
  { label: "Name A–Z", sortBy: "name", order: "ASC" },
];

export default function SearchFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildURL(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    params.set("page", "1");
    return `/?${params.toString()}`;
  }

  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        router.push(buildURL({ search: value }));
      }, 400);
    },
    [searchParams], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const category = searchParams.get("category") || "";
  const sortKey = `${searchParams.get("sortBy") || "createdAt"}_${searchParams.get("order") || "DESC"}`;

  return (
    <section
      aria-label="Product filters"
      className="flex flex-col sm:flex-row gap-3 mb-6"
    >
      <label className="sr-only" htmlFor="search-input">
        Search products
      </label>
      <input
        id="search-input"
        type="search"
        placeholder="Search products…"
        defaultValue={searchParams.get("search") || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <label className="sr-only" htmlFor="category-select">
        Category
      </label>
      <select
        id="category-select"
        value={category}
        onChange={(e) => router.push(buildURL({ category: e.target.value }))}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="sort-select">
        Sort by
      </label>
      <select
        id="sort-select"
        value={sortKey}
        onChange={(e) => {
          const [sortBy, order] = e.target.value.split("_");
          router.push(buildURL({ sortBy, order }));
        }}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {SORT_OPTIONS.map((opt) => (
          <option
            key={`${opt.sortBy}_${opt.order}`}
            value={`${opt.sortBy}_${opt.order}`}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </section>
  );
}
