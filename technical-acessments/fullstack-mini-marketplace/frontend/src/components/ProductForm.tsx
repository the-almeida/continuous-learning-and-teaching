'use client';

import { useState } from 'react';
import { ProductPayload } from '@/lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electronics', 'Clothing', 'Books'];

interface ProductFormProps {
  initial?: Partial<ProductPayload>;
  onSave: (data: ProductPayload) => Promise<void>;
  onCancel: () => void;
}

export default function ProductForm({ initial, onSave, onCancel }: ProductFormProps) {
  const [form, setForm] = useState<ProductPayload>({
    name: initial?.name || '',
    description: initial?.description || '',
    price: initial?.price || 0,
    category: initial?.category || CATEGORIES[0],
    stock: initial?.stock ?? 0,
    imageUrl: initial?.imageUrl || '',
  });
  const [saving, setSaving] = useState(false);

  function set(field: keyof ProductPayload, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div>
        <label htmlFor="pf-name" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="pf-name"
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="pf-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="pf-description"
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pf-price" className="block text-sm font-medium text-gray-700 mb-1">
            Price ($) <span aria-hidden="true">*</span>
          </label>
          <input
            id="pf-price"
            type="number"
            required
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', parseFloat(e.target.value))}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pf-stock" className="block text-sm font-medium text-gray-700 mb-1">
            Stock <span aria-hidden="true">*</span>
          </label>
          <input
            id="pf-stock"
            type="number"
            required
            min="0"
            value={form.stock}
            onChange={(e) => set('stock', parseInt(e.target.value, 10))}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="pf-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span aria-hidden="true">*</span>
        </label>
        <select
          id="pf-category"
          required
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          className={inputClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pf-image" className="block text-sm font-medium text-gray-700 mb-1">
          Image URL
        </label>
        <input
          id="pf-image"
          type="url"
          value={form.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
