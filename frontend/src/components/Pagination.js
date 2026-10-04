import PropTypes from 'prop-types';
import { ELLIPSIS_END, ELLIPSIS_START, getPageNumbers } from '../utils/pagination';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const items = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>
      {items.map((item) => (item === ELLIPSIS_START || item === ELLIPSIS_END ? (
        <span key={item} className="pagination__ellipsis" aria-hidden="true">…</span>
      ) : (
        <button
          key={item}
          type="button"
          className={`pagination__btn${item === currentPage ? ' pagination__btn--active' : ''}`}
          aria-current={item === currentPage ? 'page' : undefined}
          aria-label={`Page ${item}`}
          onClick={() => onPageChange(item)}
        >
          {item}
        </button>
      )))}
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
    </nav>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};
