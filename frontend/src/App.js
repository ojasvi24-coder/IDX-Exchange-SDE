import { Link, Route, Routes } from 'react-router-dom';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="header__brand">IDX Property Search</Link>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="*" element={<p className="message">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
