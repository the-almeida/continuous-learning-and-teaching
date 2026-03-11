import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  searchParams: Record<string, string>;
}

export function getPageNumbers(page: number, totalPages: number): (number | '...')[] {
  const pages: (number | '...')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return pages;
}

function buildHref(searchParams: Record<string, string>, targetPage: number) {
  const params = new URLSearchParams(searchParams);
  params.set('page', String(targetPage));
  return `/?${params.toString()}`;
}

export default function Pagination({ page, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const linkClass = 'px-3 py-1.5 rounded border text-sm hover:bg-gray-50 transition-colors';
  const disabledClass = 'px-3 py-1.5 rounded border text-sm opacity-40 cursor-not-allowed pointer-events-none';
  const activeClass = 'px-3 py-1.5 rounded border text-sm bg-indigo-600 text-white border-indigo-600';

  return (
    <nav aria-label="Pagination" className="flex justify-center items-center gap-2 mt-8">
      {page <= 1 ? (
        <span className={disabledClass} aria-disabled="true">&laquo; Prev</span>
      ) : (
        <Link href={buildHref(searchParams, page - 1)} className={linkClass} aria-label="Previous page">
          &laquo; Prev
        </Link>
      )}

      {getPageNumbers(page, totalPages).map((p, idx) =>
        p === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(searchParams, p)}
            aria-current={p === page ? 'page' : undefined}
            className={p === page ? activeClass : linkClass}
          >
            {p}
          </Link>
        ),
      )}

      {page >= totalPages ? (
        <span className={disabledClass} aria-disabled="true">Next &raquo;</span>
      ) : (
        <Link href={buildHref(searchParams, page + 1)} className={linkClass} aria-label="Next page">
          Next &raquo;
        </Link>
      )}
    </nav>
  );
}
