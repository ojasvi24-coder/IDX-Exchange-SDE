import PropTypes from 'prop-types';
import useFavorites from '../hooks/useFavorites';

export default function FavoriteButton({ property }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(property.L_ListingID);

  const handleClick = (event) => {
    // The card is clickable; a heart click must not navigate to the detail page.
    event.stopPropagation();
    toggleFavorite(property);
  };

  return (
    <button
      type="button"
      className="heart"
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      onClick={handleClick}
    >
      {favorited ? '♥' : '♡'}
    </button>
  );
}

FavoriteButton.propTypes = {
  property: PropTypes.shape({ L_ListingID: PropTypes.string.isRequired }).isRequired,
};
