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
  const [selectedProfile, setSelectedProfile] = useState(null);

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
    <div className="page-content favorites-page">
      <h1>My Favorites</h1>
      <p className="subtitle">Your saved items for quick access</p>

      {/* Mobile dropdown (visible on small screens) */}
      <div className="filters-mobile">
        <select
          className="filter-dropdown"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter favorites"
        >
          <option value="all">All</option>
          <option value="collaborator">Collaborator</option>
          <option value="clinical_trial">Clinical Trial</option>
          <option value="publication">Publication</option>
        </select>
      </div>

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
            
            // Collaborator Card - match Collaborators grid visual; two hyper links at bottom
            if (details.type === 'collaborator' && details.data) {
              const collab = details.data;
              const universities = [
                'Stanford University','Harvard University','MIT','University of Oxford','University of Cambridge','Johns Hopkins University','UC Berkeley','UCLA','Imperial College London','Karolinska Institute'
              ];
              const getUniversityForId = (id) => {
                const n = parseInt(id, 10);
                if (Number.isNaN(n)) return universities[0];
                return universities[Math.abs(n) % universities.length];
              };
              const university = getUniversityForId(collab.user_id);
              const pubs = collab.publications
                ? (Array.isArray(collab.publications) ? collab.publications : JSON.parse(collab.publications || '[]'))
                : [];
              return (
                <div key={favorite.id} className="collab-card">
                  <div className="collab-card-main">
                    <div className="collab-card-content">
                      <h3 className="collab-card-title">{collab.name}</h3>
                      <div className="collab-card-subtitle">
                        {(collab.specialties && collab.specialties.length > 0) ? `${collab.specialties[0]} • ${university}` : `Researcher • ${university}`}
                      </div>
                      {(collab.research_interests && collab.research_interests.length > 0) && (
                        <div className="collab-card-tags">
                          {collab.research_interests.slice(0, 2).map((interest, idx) => (
                            <span key={idx} className="collab-chip">{interest}</span>
                          ))}
                        </div>
                      )}
                      <div className="collab-card-meta">{pubs.length} recent publications</div>
                    </div>
                    <button
                      className="collab-fav active"
                      onClick={() => handleRemoveFavorite('collaborator', favorite.item_id)}
                      aria-label="Remove favorite"
                    >
                      ★
                    </button>
                  </div>
                  <div className="collab-card-actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <span className="action-link" onClick={() => setSelectedProfile(collab)}>View Profile</span>
                    <span className="action-link" style={{ textAlign: 'right', color: '#dc3545' }} onClick={() => handleRemoveFavorite('collaborator', favorite.item_id)}>Remove from Favorites</span>
                  </div>
                </div>
              );
            }
            
            // Publication Card - no AI text; links row at bottom
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
                  <div className="card-actions-row" style={{ marginTop: '12px' }}>
                    <span className="action-link" onClick={() => {
                      const doiUrl = details.data.doi ? `https://doi.org/${details.data.doi}` : null;
                      const url = details.data.full_text_url || doiUrl;
                      if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } else {
                        toast.info('No link available for this publication');
                      }
                    }}>View details</span>
                    <span className="action-link" style={{ color: '#dc3545' }} onClick={() => handleRemoveFavorite('publication', favorite.item_id)}>
                      Remove from Favorites
                    </span>
                  </div>
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

      {/* Profile Modal for favorites */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedProfile.name}</h2>
              <button className="modal-close" onClick={() => setSelectedProfile(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '10px' }}>
                {(selectedProfile.specialties && selectedProfile.specialties.length > 0)
                  ? selectedProfile.specialties.join(', ')
                  : 'Researcher'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b7280' }}>
                  {(selectedProfile.name || 'R')[0]}
                </div>
              </div>
              {(() => {
                const universities = [
                  'Stanford University','Harvard University','MIT','University of Oxford','University of Cambridge','Johns Hopkins University','UC Berkeley','UCLA','Imperial College London','Karolinska Institute'
                ];
                const getUniversityForId = (id) => {
                  const n = parseInt(id, 10);
                  if (Number.isNaN(n)) return universities[0];
                  return universities[Math.abs(n) % universities.length];
                };
                return (
                  <p style={{ color: '#6b7280', marginTop: 0 }}>{getUniversityForId(selectedProfile.user_id)}</p>
                );
              })()}
              {selectedProfile.research_interests && selectedProfile.research_interests.length > 0 && (
                <div style={{ margin: '12px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedProfile.research_interests.slice(0, 5).map((i, idx) => (
                    <span key={idx} className="collab-chip">{i}</span>
                  ))}
                </div>
              )}
              {(() => {
                const pubs = selectedProfile.publications
                  ? (Array.isArray(selectedProfile.publications)
                    ? selectedProfile.publications
                    : JSON.parse(selectedProfile.publications || '[]'))
                  : [];
                if (pubs.length === 0) return <p className="empty-state">No publications available.</p>;
                return (
                  <div>
                    <h3>Recent Publications</h3>
                    <ul style={{ paddingLeft: '18px' }}>
                      {pubs.slice(0, 5).map((p, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{p.title || 'Untitled Publication'}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;

