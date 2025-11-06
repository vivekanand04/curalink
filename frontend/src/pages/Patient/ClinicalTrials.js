import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';
import { formatAISummary, createTruncatedDescription } from '../../utils/aiSummary';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ClinicalTrials = () => {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [expandedAISummaries, setExpandedAISummaries] = useState({});
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    fetchTrials();
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
        if (fav.item_type === 'clinical_trial') {
          favoritesMap[`clinical_trial_${fav.item_id}`] = true;
        }
      });
      setFavorites(favoritesMap);
    } catch (error) {
      // Non-blocking: surface but do not break UI
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchTrials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch all trials initially
      const response = await axios.get(`${API_URL}/clinical-trials`, { headers });
      setTrials(response.data);
    } catch (error) {
      toast.error('Failed to fetch clinical trials');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (locationFilter) params.location = locationFilter;

      const response = await axios.get(`${API_URL}/clinical-trials`, { params, headers });
      setTrials(response.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (trialId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const key = `clinical_trial_${trialId}`;

      if (favorites[key]) {
        // Remove
        await axios.delete(`${API_URL}/favorites/clinical_trial/${trialId}`, { headers });
        setFavorites(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        // Add
        await axios.post(`${API_URL}/favorites`, { itemType: 'clinical_trial', itemId: Number(trialId) }, { headers });
        setFavorites(prev => ({ ...prev, [key]: true }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      const message = error.response?.data?.message || 'Failed to update favorites';
      toast.error(message);
    }
  };

  const handleContactTrial = (trial) => {
    // Open email client with pre-filled information
    const subject = encodeURIComponent(`Inquiry about: ${trial.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI am interested in learning more about this clinical trial:\n\n${trial.title}\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const toggleAISummary = (trialId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [trialId]: !prev[trialId]
    }));
  };

  return (
    <div className="page-content">
      <h1>Clinical Trials</h1>
      <p className="subtitle">Search and explore clinical trials relevant to your condition</p>

      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search trials by keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="primary-button search-button">Search</button>
        </div>

        <div className="filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="recruiting">Recruiting</option>
            <option value="completed">Completed</option>
            <option value="not yet recruiting">Not Yet Recruiting</option>
          </select>
          <input
            type="text"
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
          {trials.map((trial) => (
            <div key={trial.id} className="card modern-card trial-card">
              <div className="card-favorite-icon" onClick={() => handleToggleFavorite(trial.id)}>
                <span className={`star-icon ${favorites[`clinical_trial_${trial.id}`] ? 'star-filled' : ''}`}>
                  {favorites[`clinical_trial_${trial.id}`] ? '★' : '☆'}
                </span>
              </div>
              <h3 className="card-title">{trial.title}</h3>
              <p className="card-scope">{trial.location || 'Global'}</p>
              <span className={`status-tag status-${trial.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                {trial.status}
              </span>
              {createTruncatedDescription(
                trial.description || `A trial on ${trial.condition || 'medical research'}.`,
                trial.url
              )}
              <div className="card-actions-row">
                <span className="action-link" onClick={() => handleContactTrial(trial)}>
                  Contact Trial
                </span>
                <span className="action-link" onClick={() => toggleAISummary(trial.id)}>
                  {expandedAISummaries[trial.id] ? 'Hide AI Summary' : 'Get AI Summary'}
                </span>
              </div>
              {expandedAISummaries[trial.id] && trial.ai_summary && (
                <div className="ai-summary-container">
                  <div className="ai-summary-content">
                    {formatAISummary(trial.ai_summary)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {trials.length === 0 && !loading && (
        <p className="empty-state">No clinical trials found. Try adjusting your search criteria.</p>
      )}
    </div>
  );
};

export default ClinicalTrials;

