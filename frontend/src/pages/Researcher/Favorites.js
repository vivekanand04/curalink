import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [favoriteDetails, setFavoriteDetails] = useState({});
  const [expandedAISummaries, setExpandedAISummaries] = useState({});

  useEffect(() => {
    fetchFavorites();
  }, [filter]);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteDetails();
    } else {
      // Clear details when favorites are empty
      setFavoriteDetails({});
    }
  }, [favorites]);

  const fetchFavorites = async () => {
    setLoading(true);
    // Clear old details immediately to prevent showing stale data
    setFavoriteDetails({});
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
    setDetailsLoading(true);
    // Clear old details before fetching new ones
    setFavoriteDetails({});
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const details = {};

      // Fetch all details in parallel for better performance
      const detailPromises = favorites.map(async (fav) => {
        try {
          if (fav.item_type === 'clinical_trial') {
            const response = await axios.get(`${API_URL}/clinical-trials/${fav.item_id}`, { headers });
            return { key: fav.id, value: { type: 'clinical_trial', data: response.data } };
          } else if (fav.item_type === 'publication') {
            const response = await axios.get(`${API_URL}/publications`, { headers });
            const pub = response.data.find(p => p.id === fav.item_id);
            if (pub) return { key: fav.id, value: { type: 'publication', data: pub } };
          } else if (fav.item_type === 'collaborator') {
            const response = await axios.get(`${API_URL}/collaborators/search`, { headers });
            const collab = response.data.find(c => c.user_id === fav.item_id);
            if (collab) return { key: fav.id, value: { type: 'collaborator', data: collab } };
          }
        } catch (error) {
          console.error(`Error fetching details for ${fav.item_type} ${fav.item_id}:`, error);
        }
        return null;
      });

      const results = await Promise.all(detailPromises);
      results.forEach(result => {
        if (result) {
          details[result.key] = result.value;
        }
      });

      setFavoriteDetails(details);
    } catch (error) {
      console.error('Error fetching favorite details:', error);
    } finally {
      setDetailsLoading(false);
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

  const toggleAISummary = (favoriteId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [favoriteId]: !prev[favoriteId]
    }));
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

      {loading || detailsLoading ? (
        <p>Loading favorites...</p>
      ) : (
        <div className="cards-grid">
          {filteredFavorites.map((favorite) => {
            const details = favoriteDetails[favorite.id];
            // Only render card if details are loaded
            if (!details) {
              return null;
            }
            
            // Clinical Trial Card - matching dashboard design
            if (details.type === 'clinical_trial' && details.data) {
              return (
                <div key={favorite.id} className="card modern-card trial-card">
                  <div className="card-favorite-icon" onClick={() => handleRemoveFavorite('clinical_trial', favorite.item_id)}>
                    <span className="star-icon star-filled">★</span>
                  </div>
                  <h3 className="card-title">{details.data.title}</h3>
                  <p className="card-scope">{details.data.location || 'Global'}</p>
                  <span className={`status-tag status-${details.data.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {details.data.status}
                  </span>
                  <p className="card-description">
                    {details.data.description || `A trial on ${details.data.condition || 'medical research'}.`}
                  </p>
                  <div className="card-actions-row">
                    <span className="action-link" onClick={() => handleRemoveFavorite('clinical_trial', favorite.item_id)}>
                      Remove from Favorites
                    </span>
                    {details.data.ai_summary && (
                      <span className="action-link" onClick={() => toggleAISummary(favorite.id)}>
                        {expandedAISummaries[favorite.id] ? 'Hide AI Summary' : 'Get AI Summary'}
                      </span>
                    )}
                  </div>
                  {expandedAISummaries[favorite.id] && details.data.ai_summary && (
                    <div className="ai-summary-container">
                      <div className="ai-summary-content">
                        {details.data.ai_summary}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            
            // Collaborator Card - matching dashboard design
            if (details.type === 'collaborator' && details.data) {
              return (
                <div key={favorite.id} className="card modern-card expert-card">
                  <div className="card-favorite-icon" onClick={() => handleRemoveFavorite('collaborator', favorite.item_id)}>
                    <span className="star-icon star-filled">★</span>
                  </div>
                  <h3 className="card-title" style={{ color: '#34A853', fontWeight: 700 }}>{details.data.name}</h3>
                  <p className="card-affiliation">
                    {details.data.specialties && details.data.specialties.length > 0 
                      ? `${details.data.specialties[0]}${details.data.specialties.length > 1 ? `, ${details.data.specialties[1]}` : ''}`
                      : 'Researcher'}
                  </p>
                  {details.data.research_interests && details.data.research_interests.length > 0 && (
                    <>
                      <p className="card-section-label">Research Interests:</p>
                      <div className="interests-tags">
                        {details.data.research_interests.slice(0, 3).map((interest, idx) => (
                          <span key={idx} className="interest-tag">{interest}</span>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="card-actions-buttons">
                    <button
                      onClick={() => handleRemoveFavorite('collaborator', favorite.item_id)}
                      className="danger-button"
                      style={{ marginTop: '10px' }}
                    >
                      Remove from Favorites
                    </button>
                  </div>
                </div>
              );
            }
            
            // Publication Card - keeping existing style
            if (details.type === 'publication' && details.data) {
              return (
                <div key={favorite.id} className="card modern-card publication-card">
                  <div className="card-favorite-icon" onClick={() => handleRemoveFavorite('publication', favorite.item_id)}>
                    <span className="star-icon star-filled">★</span>
                  </div>
                  <h3 className="card-title">{details.data.title}</h3>
                  {details.data.authors && details.data.authors.length > 0 && (
                    <p className="card-authors">
                      By {details.data.authors.slice(0, 3).join(', ')}
                    </p>
                  )}
                  {details.data.journal && (
                    <p className="card-meta">Journal: {details.data.journal}</p>
                  )}
                  {details.data.ai_summary && (
                    <div className="ai-summary">
                      <strong>AI Summary:</strong> {details.data.ai_summary}
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveFavorite('publication', favorite.item_id)}
                    className="danger-button"
                    style={{ marginTop: '10px' }}
                  >
                    Remove from Favorites
                  </button>
                </div>
              );
            }
            
            return null;
          })}
        </div>
      )}

      {filteredFavorites.length === 0 && !loading && !detailsLoading && (
        <p className="empty-state">
          No favorites found. Start saving items to see them here.
        </p>
      )}
    </div>
  );
};

export default Favorites;

