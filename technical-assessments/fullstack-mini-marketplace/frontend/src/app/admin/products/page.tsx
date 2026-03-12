"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  productsApi,
  Product,
  ProductPayload,
  ProductsResponse,
} from "@/lib/api";
import ProductForm from "@/components/ProductForm";
import toast from "react-hot-toast";

type FormMode = { type: "create" } | { type: "edit"; product: Product } | null;

export default function AdminProductsPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!isAdmin) {
      router.push("/");
      return;
    }
    loadProducts();
  }, [user, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProducts() {
    setLoading(true);
    try {
      const data: ProductsResponse = await productsApi.list({ limit: 100 });
      setProducts(data.items);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load products",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: ProductPayload) {
    if (formMode?.type === "edit") {
      await productsApi.update(formMode.product.id, data);
      toast.success("Product updated");
    } else {
      await productsApi.create(data);
      toast.success("Product created");
    }
    setFormMode(null);
    await loadProducts();
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`))
      return;
    try {
      await productsApi.delete(product.id);
      toast.success("Product deleted");
      await loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
        {!formMode && (
          <button
            onClick={() => setFormMode({ type: "create" })}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            + New product
          </button>
        )}
      </div>

      {formMode && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            {formMode.type === "edit"
              ? `Edit: ${formMode.product.name}`
              : "New product"}
          </h2>
          <ProductForm
            initial={formMode.type === "edit" ? formMode.product : undefined}
            onSave={handleSave}
            onCancel={() => setFormMode(null)}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${Number(product.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        product.stock === 0 ? "text-red-500" : "text-gray-600"
                      }
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setFormMode({ type: "edit", product })}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
