import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import PropertyImageCarousel from './PropertyImageCarousel';
import { parsePhotos } from '../utils/photos';
import {
  formatAddress, formatBaths, formatBeds, formatPrice, formatSqft,
} from '../utils/format';

export default function PropertyCard({ property }) {
  const navigate = useNavigate();
  const photos = useMemo(() => parsePhotos(property.L_Photos), [property.L_Photos]);
  const { street, locality } = formatAddress(property);
  const facts = [
    formatBeds(property.L_Keyword2),
    formatBaths(property.LM_Dec_3),
    formatSqft(property.LM_Int2_3),
  ].filter(Boolean);
  const path = `/property/${encodeURIComponent(property.L_ListingID)}`;

  return (
    // The whole card is clickable for mouse users; the address <Link> is the
    // keyboard/screen-reader entry point to the same destination.
    <article className="card" onClick={() => navigate(path)} data-testid="property-card">
      <FavoriteButton property={property} />
      <PropertyImageCarousel photos={photos} alt={`Photo of ${street}`} />
      <div className="card__body">
        <p className="card__price">{formatPrice(property.L_SystemPrice)}</p>
        <h3 className="card__address">
          <Link to={path} onClick={(e) => e.stopPropagation()}>{street}</Link>
        </h3>
        {locality && <p className="card__locality">{locality}</p>}
        {facts.length > 0 && <p className="card__facts">{facts.join(' · ')}</p>}
      </div>
    </article>
  );
}

PropertyCard.propTypes = {
  property: PropTypes.shape({
    L_ListingID: PropTypes.string.isRequired,
    L_Address: PropTypes.string,
    L_City: PropTypes.string,
    L_State: PropTypes.string,
    L_Zip: PropTypes.string,
    L_SystemPrice: PropTypes.number,
    L_Keyword2: PropTypes.number,
    LM_Dec_3: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    LM_Int2_3: PropTypes.number,
    L_Photos: PropTypes.string,
  }).isRequired,
};
