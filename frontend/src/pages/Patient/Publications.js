import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Publications = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // First try to get personalized publications
      try {
        const personalizedResponse = await axios.get(`${API_URL}/publications/personalized`, { headers });
        if (personalizedResponse.data && personalizedResponse.data.length > 0) {
          setPublications(personalizedResponse.data);
          setLoading(false);
          return;
        }
      } catch (error) {
        // If personalized fails or returns empty, fetch all publications
        console.log('No personalized publications, fetching all publications');
      }
      
      // Fallback to all publications if personalized returns empty
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

  const handleAddFavorite = async (pubId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/favorites`, {
        itemType: 'publication',
        itemId: pubId,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Added to favorites');
    } catch (error) {
      toast.error('Failed to add to favorites');
    }
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
        <button onClick={handleSearch} className="primary-button">Search</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
          {publications.map((pub) => (
            <div key={pub.id} className="card">
              <h3>{pub.title}</h3>
              {pub.authors && pub.authors.length > 0 && (
                <p className="card-meta">
                  <strong>Authors:</strong> {pub.authors.slice(0, 3).join(', ')}
                  {pub.authors.length > 3 && ' et al.'}
                </p>
              )}
              {pub.journal && (
                <p className="card-meta">
                  <strong>Journal:</strong> {pub.journal}
                </p>
              )}
              {pub.publication_date && (
                <p className="card-meta">
                  <strong>Published:</strong> {new Date(pub.publication_date).toLocaleDateString()}
                </p>
              )}
              {pub.abstract && (
                <p className="card-description">
                  {pub.abstract.substring(0, 250)}...
                </p>
              )}
              {pub.ai_summary && (
                <div className="ai-summary">
                  <strong>AI Summary:</strong> {pub.ai_summary}
                </div>
              )}
              <div className="card-actions">
                <button
                  onClick={() => handleAddFavorite(pub.id)}
                  className="secondary-button"
                >
                  Add to Favorites
                </button>
                {pub.full_text_url && (
                  <a
                    href={pub.full_text_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-button link-button"
                  >
                    Read Full Paper
                  </a>
                )}
              </div>
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

