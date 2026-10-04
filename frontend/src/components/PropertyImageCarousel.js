import { useState } from 'react';
import PropTypes from 'prop-types';

export default function PropertyImageCarousel({ photos, alt = 'Property photo' }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(() => new Set());

  const count = photos.length;
  const current = photos[Math.min(index, Math.max(count - 1, 0))];
  const showImage = count > 0 && !failed.has(current);

  // The card is clickable (navigates to the detail page). stopPropagation keeps
  // a click on an arrow from bubbling up to the card's onClick.
  const step = (delta) => (event) => {
    event.stopPropagation();
    setIndex((i) => (i + delta + count) % count);
  };

  return (
    <div className="carousel">
      {showImage ? (
        <img
          className="carousel__image"
          src={current}
          alt={alt}
          loading="lazy"
          onError={() => setFailed((prev) => new Set(prev).add(current))}
        />
      ) : (
        <div className="carousel__placeholder" role="img" aria-label="No photo available">
          No photo available
        </div>
      )}
      {count > 1 && (
        <>
          <button type="button" className="carousel__btn carousel__btn--prev" aria-label="Previous photo" onClick={step(-1)}>
            ‹
          </button>
          <button type="button" className="carousel__btn carousel__btn--next" aria-label="Next photo" onClick={step(1)}>
            ›
          </button>
          <span className="carousel__counter" aria-live="polite">{`${index + 1} / ${count}`}</span>
        </>
      )}
    </div>
  );
}

PropertyImageCarousel.propTypes = {
  photos: PropTypes.arrayOf(PropTypes.string).isRequired,
  alt: PropTypes.string,
};
