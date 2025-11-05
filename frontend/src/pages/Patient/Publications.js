import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Publications = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAISummaries, setExpandedAISummaries] = useState({});
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    fetchPublications();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const response = await axios.get(`${API_URL}/favorites`, { headers });
      const favoritesMap = {};
      response.data.forEach(fav => {
        if (fav.item_type === 'publication') {
          favoritesMap[`publication_${fav.item_id}`] = true;
        }
      });
      setFavorites(favoritesMap);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch all publications initially
      const response = await axios.get(`${API_URL}/publications`, { headers });
      setPublications(response.data);
    } catch (error) {
      toast.error('Failed to fetch publications');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPublications();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const response = await axios.get(`${API_URL}/publications/search`, {
        params: { query: searchQuery },
        headers
      });
      setPublications(response.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (pubId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const key = `publication_${pubId}`;

      if (favorites[key]) {
        await axios.delete(`${API_URL}/favorites/publication/${pubId}`, { headers });
        setFavorites(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API_URL}/favorites`, { itemType: 'publication', itemId: Number(pubId) }, { headers });
        setFavorites(prev => ({ ...prev, [key]: true }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      const message = error.response?.data?.message || 'Failed to update favorites';
      toast.error(message);
    }
  };

  const toggleAISummary = (pubId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [pubId]: !prev[pubId]
    }));
  };

  return (
    <div className="page-content">
      <h1>Publications</h1>
      <p className="subtitle">Explore the latest medical research and publications</p>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search publications by keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="primary-button search-button">Search</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
          {publications.map((pub) => (
            <div key={pub.id} className="card modern-card publication-card">
              <div className="card-favorite-icon" onClick={() => handleToggleFavorite(pub.id)}>
                <span className={`star-icon ${favorites[`publication_${pub.id}`] ? 'star-filled' : ''}`}>
                  {favorites[`publication_${pub.id}`] ? '★' : '☆'}
                </span>
              </div>
              <h3 className="card-title">{pub.title}</h3>
              {pub.journal && pub.publication_date && (
                <p className="card-source">
                  {pub.journal} • {new Date(pub.publication_date).getFullYear()}
                </p>
              )}
              {pub.authors && pub.authors.length > 0 && (
                <p className="card-authors">
                  By {pub.authors.slice(0, 2).map(author => author.includes('Dr.') ? author : `Dr. ${author}`).join(', ')}
                  {pub.authors.length > 2 && ' et al.'}
                </p>
              )}
              <div className="card-actions-row">
                <span className="action-link">
                  {pub.full_text_url ? (
                    <a
                      href={pub.full_text_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Full Paper
                    </a>
                  ) : (
                    <span style={{ color: '#9ca3af', cursor: 'not-allowed' }}>View Full Paper</span>
                  )}
                </span>
                <span className="action-link" onClick={() => toggleAISummary(pub.id)}>
                  {expandedAISummaries[pub.id] ? 'Hide AI Summary' : 'Get AI Summary'}
                </span>
              </div>
              {expandedAISummaries[pub.id] && pub.ai_summary && (
                <div className="ai-summary-container">
                  <div className="ai-summary-content">
                    {pub.ai_summary}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {publications.length === 0 && !loading && (
        <p className="empty-state">No publications found. Try searching with different keywords.</p>
      )}
    </div>
  );
};

export default Publications;

