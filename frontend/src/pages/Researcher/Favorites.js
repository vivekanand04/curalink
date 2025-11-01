import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, [filter]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await axios.get(`${API_URL}/favorites`, { params });
      setFavorites(response.data);
    } catch (error) {
      toast.error('Failed to fetch favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (itemType, itemId) => {
    try {
      await axios.delete(`${API_URL}/favorites/${itemType}/${itemId}`);
      toast.success('Removed from favorites');
      fetchFavorites();
    } catch (error) {
      toast.error('Failed to remove from favorites');
    }
  };

  const filteredFavorites = filter === 'all' 
    ? favorites 
    : favorites.filter(fav => fav.item_type === filter);

  return (
    <div className="page-content">
      <h1>My Favorites</h1>
      <p className="subtitle">Your saved items for quick access</p>

      <div className="filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'clinical_trial' ? 'active' : ''}
          onClick={() => setFilter('clinical_trial')}
        >
          Clinical Trials
        </button>
        <button
          className={filter === 'publication' ? 'active' : ''}
          onClick={() => setFilter('publication')}
        >
          Publications
        </button>
        <button
          className={filter === 'collaborator' ? 'active' : ''}
          onClick={() => setFilter('collaborator')}
        >
          Collaborators
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
          {filteredFavorites.map((favorite) => (
            <div key={favorite.id} className="card">
              <h3>Item ID: {favorite.item_id}</h3>
              <p className="card-meta">Type: {favorite.item_type}</p>
              <p className="card-meta">
                Saved: {new Date(favorite.created_at).toLocaleDateString()}
              </p>
              <button
                onClick={() => handleRemoveFavorite(favorite.item_type, favorite.item_id)}
                className="danger-button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {filteredFavorites.length === 0 && !loading && (
        <p className="empty-state">
          No favorites found. Start saving items to see them here.
        </p>
      )}
    </div>
  );
};

export default Favorites;

