import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import PhotoLightbox from './PhotoLightbox';
import { parsePhotos } from '../utils/photos';

export default function PropertyImageGallery({ rawPhotos, alt = 'Property photo' }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(() => new Set());
  const openerRef = useRef(null);
  const wasOpen = useRef(false);

  // Return focus to the button that opened the lightbox (keyboard users would
  // otherwise be dropped at the top of the page). Uses our own ref rather than
  // document.activeElement because Safari does not focus buttons on click.
  useEffect(() => {
    if (wasOpen.current && !open && openerRef.current) openerRef.current.focus();
    wasOpen.current = open;
  }, [open]);

  // Photos whose URL no longer loads (MLS image links expire) are dropped so
  // the gallery never shows broken thumbnails.
  const parsed = useMemo(() => parsePhotos(rawPhotos), [rawPhotos]);
  const photos = useMemo(() => parsed.filter((url) => !failed.has(url)), [parsed, failed]);
  const markFailed = (url) => setFailed((prev) => new Set(prev).add(url));

  if (photos.length === 0) {
    return <div className="gallery__empty" role="img" aria-label="No photos available">No photos available</div>;
  }

  const current = Math.min(index, photos.length - 1);

  return (
    <div className="gallery">
      <button
        ref={openerRef}
        type="button"
        className="gallery__main"
        aria-label="Open photo in full screen"
        onClick={() => setOpen(true)}
      >
        <img src={photos[current]} alt={alt} onError={() => markFailed(photos[current])} />
      </button>
      {photos.length > 1 && (
        <div className="gallery__thumbs">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              className={`gallery__thumb${i === current ? ' gallery__thumb--active' : ''}`}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={i === current ? 'true' : undefined}
              onClick={() => setIndex(i)}
            >
              <img src={url} alt="" loading="lazy" onError={() => markFailed(url)} />
            </button>
          ))}
        </div>
      )}
      {open && (
        <PhotoLightbox
          photos={photos}
          index={current}
          alt={alt}
          onIndexChange={setIndex}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

PropertyImageGallery.propTypes = {
  rawPhotos: PropTypes.string,
  alt: PropTypes.string,
};
