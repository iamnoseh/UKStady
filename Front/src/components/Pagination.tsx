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
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-muted shadow-sm sm:px-4 sm:py-3 sm:text-sm">
      <span className="truncate">
        {from}-{to} аз {total}
      </span>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-2.5 sm:h-9 sm:px-3"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Саҳифаи қаблӣ"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-14 text-center font-semibold text-ink sm:min-w-16">
          {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-2.5 sm:h-9 sm:px-3"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Саҳифаи навбатӣ"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
