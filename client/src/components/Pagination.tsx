interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}

export default function Pagination({ total, limit, offset, onChange }: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        disabled={!hasPrev}
        onClick={() => onChange(Math.max(0, offset - limit))}
        className="rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        이전
      </button>
      <span className="text-sm text-gray-400">
        {currentPage} / {totalPages}
      </span>
      <button
        disabled={!hasNext}
        onClick={() => onChange(offset + limit)}
        className="rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        다음
      </button>
    </div>
  );
}
