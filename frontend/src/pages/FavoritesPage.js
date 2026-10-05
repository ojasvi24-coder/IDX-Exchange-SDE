import { Link } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import useFavorites from '../hooks/useFavorites';

export default function FavoritesPage() {
  const { favorites, count } = useFavorites();

  if (count === 0) {
    return (
      <p className="message">
        No favorites yet. Tap the heart on a listing to save it. <Link to="/">Browse listings</Link>
      </p>
    );
  }

  return (
    <section>
      <p className="summary">{`${count} favorite ${count === 1 ? 'property' : 'properties'}`}</p>
      <div className="grid">
        {favorites.map((property) => (
          <PropertyCard key={property.L_ListingID} property={property} />
        ))}
      </div>
    </section>
  );
}
