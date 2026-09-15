import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageCount,
    items: items.slice(start, start + pageSize),
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
  };
}

export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0 || pageCount <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm text-muted shadow-sm sm:flex-row sm:items-center">
      <span>
        {from}-{to} аз {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-20 text-center font-semibold text-ink">
          {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
