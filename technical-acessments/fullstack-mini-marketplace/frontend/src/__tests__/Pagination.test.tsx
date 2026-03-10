import { render, screen } from '@testing-library/react';
import Pagination, { getPageNumbers } from '@/components/Pagination';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('getPageNumbers', () => {
  it('returns [1] for a single page', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });

  it('returns all pages when totalPages is 5', () => {
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses middle pages with ellipsis (10 pages, current=5)', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
  });

  it('collapses end pages on first page (10 pages, current=1)', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, '...', 10]);
  });

  it('collapses start pages on last page (10 pages, current=10)', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 9, 10]);
  });

  it('does not add double ellipsis', () => {
    const result = getPageNumbers(5, 20);
    const ellipsisCount = result.filter((p) => p === '...').length;
    expect(ellipsisCount).toBe(2);
  });
});

describe('Pagination component', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} searchParams={{}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('marks the current page with aria-current="page"', () => {
    render(<Pagination page={3} totalPages={5} searchParams={{}} />);
    const currentLink = screen.getByRole('link', { name: '3' });
    expect(currentLink).toHaveAttribute('aria-current', 'page');
  });

  it('Prev link is disabled on first page', () => {
    render(<Pagination page={1} totalPages={5} searchParams={{}} />);
    expect(screen.getByText(/prev/i).closest('a')).toBeNull();
  });

  it('Next link is disabled on last page', () => {
    render(<Pagination page={5} totalPages={5} searchParams={{}} />);
    expect(screen.getByText(/next/i).closest('a')).toBeNull();
  });

  it('preserves existing searchParams in href', () => {
    render(
      <Pagination page={1} totalPages={3} searchParams={{ category: 'Electronics', search: 'test' }} />,
    );
    const page2Link = screen.getByRole('link', { name: '2' });
    expect(page2Link.getAttribute('href')).toContain('category=Electronics');
    expect(page2Link.getAttribute('href')).toContain('search=test');
    expect(page2Link.getAttribute('href')).toContain('page=2');
  });
});
