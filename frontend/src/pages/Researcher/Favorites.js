import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const [favoriteDetails, setFavoriteDetails] = useState({});

  useEffect(() => {
    fetchFavorites();
  }, [filter]);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteDetails();
    }
  }, [favorites]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await axios.get(`${API_URL}/favorites`, { 
        params,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setFavorites(response.data);
    } catch (error) {
      toast.error('Failed to fetch favorites');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const details = {};

      for (const fav of favorites) {
        try {
          if (fav.item_type === 'clinical_trial') {
            const response = await axios.get(`${API_URL}/clinical-trials/${fav.item_id}`, { headers });
            details[fav.id] = { type: 'clinical_trial', data: response.data };
          } else if (fav.item_type === 'publication') {
            const response = await axios.get(`${API_URL}/publications`, { headers });
            const pub = response.data.find(p => p.id === fav.item_id);
            if (pub) details[fav.id] = { type: 'publication', data: pub };
          } else if (fav.item_type === 'collaborator') {
            const response = await axios.get(`${API_URL}/collaborators/search`, { headers });
            const collab = response.data.find(c => c.user_id === fav.item_id);
            if (collab) details[fav.id] = { type: 'collaborator', data: collab };
          }
        } catch (error) {
          console.error(`Error fetching details for ${fav.item_type} ${fav.item_id}:`, error);
        }
      }

      setFavoriteDetails(details);
    } catch (error) {
      console.error('Error fetching favorite details:', error);
    }
  };

  const handleRemoveFavorite = async (itemType, itemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/favorites/${itemType}/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
          {filteredFavorites.map((favorite) => {
            const details = favoriteDetails[favorite.id];
            return (
              <div key={favorite.id} className="card">
                {details?.type === 'clinical_trial' && details.data && (
                  <>
                    <h3>{details.data.title}</h3>
                    <p className="card-meta">Condition: {details.data.condition}</p>
                    <p className="card-meta">Status: {details.data.status}</p>
                    {details.data.ai_summary && (
                      <div className="ai-summary">
                        <strong>AI Summary:</strong> {details.data.ai_summary}
                      </div>
                    )}
                  </>
                )}
                {details?.type === 'publication' && details.data && (
                  <>
                    <h3>{details.data.title}</h3>
                    {details.data.authors && details.data.authors.length > 0 && (
                      <p className="card-meta">Authors: {details.data.authors.slice(0, 3).join(', ')}</p>
                    )}
                    {details.data.journal && (
                      <p className="card-meta">Journal: {details.data.journal}</p>
                    )}
                    {details.data.ai_summary && (
                      <div className="ai-summary">
                        <strong>AI Summary:</strong> {details.data.ai_summary}
                      </div>
                    )}
                  </>
                )}
                {details?.type === 'collaborator' && details.data && (
                  <>
                    <h3>{details.data.name}</h3>
                    {details.data.specialties && details.data.specialties.length > 0 && (
                      <p className="card-meta">Specialties: {details.data.specialties.join(', ')}</p>
                    )}
                    {details.data.research_interests && details.data.research_interests.length > 0 && (
                      <p className="card-meta">Research Interests: {details.data.research_interests.join(', ')}</p>
                    )}
                  </>
                )}
                {!details && (
                  <>
                    <h3>{favorite.item_type.replace('_', ' ')} #{favorite.item_id}</h3>
                    <p className="card-meta">Type: {favorite.item_type}</p>
                  </>
                )}
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
            );
          })}
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

