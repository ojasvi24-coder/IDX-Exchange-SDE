import { Link, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import useFavorites from './hooks/useFavorites';
import FavoritesPage from './pages/FavoritesPage';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import './App.css';

export default function App() {
  const { count } = useFavorites();
  const { pathname } = useLocation();
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="header__brand">IDX Property Search</Link>
        <nav className="header__nav" aria-label="Main">
          <Link to="/">Listings</Link>
          <Link to="/favorites">{`Favorites (${count})`}</Link>
        </nav>
      </header>
      <main className="main">
        <ErrorBoundary resetKey={pathname}>
          <Routes>
            <Route path="/" element={<ListingsPage />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="*" element={<p className="message">Page not found.</p>} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
