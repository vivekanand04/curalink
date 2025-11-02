import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ClinicalTrials = () => {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showAISummary, setShowAISummary] = useState(null);

  useEffect(() => {
    fetchTrials();
  }, []);

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

  const handleAddFavorite = async (trialId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/favorites`, {
        itemType: 'clinical_trial',
        itemId: trialId,
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

  const handleContactTrial = (trial) => {
    // Open email client with pre-filled information
    const subject = encodeURIComponent(`Inquiry about: ${trial.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI am interested in learning more about this clinical trial:\n\n${trial.title}\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShowAISummary = (trial) => {
    if (trial.ai_summary) {
      setShowAISummary(trial);
    } else {
      toast.info('AI summary not available for this trial');
    }
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
          <button onClick={handleSearch} className="primary-button">Search</button>
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
              <div className="card-favorite-icon" onClick={() => handleAddFavorite(trial.id)}>
                <span className="star-icon">☆</span>
              </div>
              <h3 className="card-title">{trial.title}</h3>
              <p className="card-scope">{trial.location || 'Global'}</p>
              <span className={`status-tag status-${trial.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                {trial.status}
              </span>
              <p className="card-description">
                {trial.description || `A trial on ${trial.condition || 'medical research'}.`}
              </p>
              <div className="card-actions-row">
                <span className="action-link" onClick={() => handleContactTrial(trial)}>
                  Contact Trial
                </span>
                <span className="action-link" onClick={() => handleShowAISummary(trial)}>
                  Get AI Summary
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAISummary && (
        <div className="modal-overlay" onClick={() => setShowAISummary(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>AI Summary</h2>
              <button className="modal-close" onClick={() => setShowAISummary(null)}>×</button>
            </div>
            <div className="modal-body">
              <h3>{showAISummary.title}</h3>
              <p>{showAISummary.ai_summary || 'AI summary not available.'}</p>
            </div>
          </div>
        </div>
      )}

      {trials.length === 0 && !loading && (
        <p className="empty-state">No clinical trials found. Try adjusting your search criteria.</p>
      )}
    </div>
  );
};

export default ClinicalTrials;

