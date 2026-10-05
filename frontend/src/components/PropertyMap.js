import PropTypes from 'prop-types';
import { parseCoordinates } from '../utils/coordinates';

export default function PropertyMap({ latitude, longitude, address = 'Property' }) {
  // Only render when BOTH coordinates are real numbers; null and 0 mean "unknown".
  const coords = parseCoordinates(latitude, longitude);
  if (!coords) return <p className="message">Map unavailable: no location on file for this property.</p>;

  // Read at render time (CRA inlines it at build time) so the key never lives in source.
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const place = `${coords.lat},${coords.lng}`;
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey || '')}&q=${place}&zoom=15`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place}`;

  return (
    <div className="map">
      {apiKey ? (
        <iframe
          className="map__frame"
          title={`Map showing ${address}`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <p className="message">Map preview unavailable: set REACT_APP_GOOGLE_MAPS_API_KEY.</p>
      )}
      <a className="map__directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">
        Get Directions
      </a>
    </div>
  );
}

PropertyMap.propTypes = {
  latitude: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  longitude: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  address: PropTypes.string,
};
