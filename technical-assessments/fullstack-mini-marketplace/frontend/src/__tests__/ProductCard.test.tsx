import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/lib/api";

// Mock next/image and next/link
/* eslint-disable @next/next/no-img-element */
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt,
    fill,
    sizes,
    ...props
  }: {
    alt: string;
    fill?: boolean;
    sizes?: string;
  }) => <img alt={alt} {...props} />,
}));
/* eslint-enable @next/next/no-img-element */
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock CartContext
const mockAdd = jest.fn();
jest.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ add: mockAdd }),
}));

const baseProduct: Product = {
  id: "prod-1",
  name: "Test Product",
  description: "A test product description",
  price: 29.99,
  category: "Electronics",
  stock: 10,
  imageUrl: "https://example.com/image.jpg",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("ProductCard", () => {
  beforeEach(() => mockAdd.mockClear());

  it("renders the product name, price, and category", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("$29.99")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("displays price with 2 decimal places", () => {
    render(<ProductCard product={{ ...baseProduct, price: 5 }} />);
    expect(screen.getByText("$5.00")).toBeInTheDocument();
  });

  it('shows "Add to cart" button when stock > 0', () => {
    render(<ProductCard product={baseProduct} />);
    const btn = screen.getByRole("button", { name: /add to cart/i });
    expect(btn).toBeEnabled();
  });

  it('shows "Out of stock" and disables button when stock is 0', () => {
    render(<ProductCard product={{ ...baseProduct, stock: 0 }} />);
    const btn = screen.getByRole("button", { name: /out of stock/i });
    expect(btn).toBeDisabled();
  });

  it('calls cart.add when "Add to cart" is clicked', async () => {
    render(<ProductCard product={baseProduct} />);
    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith(baseProduct);
  });
});
