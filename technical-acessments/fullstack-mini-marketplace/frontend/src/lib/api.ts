const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  register: (email: string, password: string) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};

// Products
export const productsApi = {
  list: (params: ProductQuery) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
      ) as Record<string, string>,
    ).toString();
    return request<ProductsResponse>(`/products${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<Product>(`/products/${id}`),
  create: (data: ProductPayload) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ProductPayload>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/products/${id}`, { method: 'DELETE' }),
};

// Orders
export const ordersApi = {
  create: (items: OrderItem[]) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify({ items }) }),
  list: () => request<Order[]>('/orders'),
};

// Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'customer';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: string;
  order?: string;
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: Product;
  }>;
}
