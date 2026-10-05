import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

export default function PhotoLightbox({
  photos, index, alt, onIndexChange, onClose,
}) {
  const dialogRef = useRef(null);
  const count = photos.length;

  // ROOT CAUSE of the "Escape does nothing" bug: keyboard events are delivered
  // to the focused element. A <div> is not focusable by default, so focus stayed
  // on the (now covered) opener button / <body> and the div's onKeyDown never
  // fired. Fix: make the dialog focusable (tabIndex=-1) and move focus into it
  // on open. (The gallery restores focus to its opener when the dialog closes.)
  useEffect(() => {
    dialogRef.current.focus();
  }, []);

  const step = (delta) => onIndexChange((index + delta + count) % count);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') onClose();
    else if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
  };

  // Only a click on the dark backdrop itself closes; clicks on the image or the
  // buttons (children) must not bubble into a close.
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={dialogRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <img className="lightbox__image" src={photos[index]} alt={alt} />
      <button type="button" className="lightbox__btn lightbox__btn--close" aria-label="Close" onClick={onClose}>×</button>
      {count > 1 && (
        <>
          <button type="button" className="lightbox__btn lightbox__btn--prev" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
          <button type="button" className="lightbox__btn lightbox__btn--next" aria-label="Next photo" onClick={() => step(1)}>›</button>
          <span className="lightbox__counter">{`${index + 1} / ${count}`}</span>
        </>
      )}
    </div>
  );
}

PhotoLightbox.propTypes = {
  photos: PropTypes.arrayOf(PropTypes.string).isRequired,
  index: PropTypes.number.isRequired,
  alt: PropTypes.string.isRequired,
  onIndexChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
