import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RecommendedPublications = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [expandedAISummaries, setExpandedAISummaries] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchPublications();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const response = await axios.get(`${API_URL}/patients/profile`, { headers });
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch ONLY personalized publications
      const response = await axios.get(`${API_URL}/publications/personalized`, { headers });
      setPublications(response.data || []);
    } catch (error) {
      console.error('Error fetching personalized publications:', error);
      toast.error('Failed to fetch recommended publications');
      setPublications([]);
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
    <div className="recommended-page">
      <div className="recommended-page-header">
        <button className="back-button" onClick={() => navigate('/patient/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>
          {profile?.conditions && profile.conditions.length > 0 
            ? `Recommended Publications for ${profile.conditions.join(', ')}`
            : 'Recommended Publications'}
        </h1>
        <p className="subtitle">
          {profile?.conditions && profile.conditions.length > 0 
            ? `Research publications tailored to your conditions: ${profile.conditions.join(', ')}`
            : 'Complete your profile to get personalized recommendations'}
        </p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading recommended publications...</p>
        </div>
      ) : publications.length > 0 ? (
        <div className="cards-grid recommended-grid">
          {publications.map((pub) => (
            <div key={pub.id} className="card modern-card publication-card">
              <div className="card-favorite-icon" onClick={() => handleAddFavorite(pub.id)}>
                <span className="star-icon">☆</span>
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
                <span className="action-link" onClick={() => {
                  setExpandedAISummaries(prev => ({
                    ...prev,
                    [pub.id]: !prev[pub.id]
                  }));
                }}>
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
      ) : (
        <div className="empty-state-container">
          <p className="empty-state">
            {profile?.conditions && profile.conditions.length > 0
              ? 'No recommended publications found for your conditions. Try updating your profile or check back later.'
              : 'Complete your profile with your conditions to get personalized publication recommendations.'}
          </p>
          <button 
            className="primary-button" 
            onClick={() => navigate('/patient/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendedPublications;

