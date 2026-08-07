import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pageHref = (page: number) => (page === 1 ? basePath : `${basePath}?page=${page}`);

  return (
    <nav className="pagination" aria-label="Pagination">
      {currentPage > 1 ? (
        <Link className="pagination-link pagination-prev" href={pageHref(currentPage - 1)} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span className="pagination-spacer" aria-hidden="true" />
      )}

      <span className="pagination-status">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link className="pagination-link pagination-next" href={pageHref(currentPage + 1)} rel="next">
          Older →
        </Link>
      ) : (
        <span className="pagination-spacer" aria-hidden="true" />
      )}
    </nav>
  );
}
