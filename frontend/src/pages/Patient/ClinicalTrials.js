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
      
      // First try to get personalized trials
      try {
        const personalizedResponse = await axios.get(`${API_URL}/clinical-trials/personalized`, { headers });
        if (personalizedResponse.data && personalizedResponse.data.length > 0) {
          setTrials(personalizedResponse.data);
          setLoading(false);
          return;
        }
      } catch (error) {
        // If personalized fails or returns empty, fetch all trials
        console.log('No personalized trials, fetching all trials');
      }
      
      // Fallback to all trials if personalized returns empty
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
            <div key={trial.id} className="card">
              <h3>{trial.title}</h3>
              <p className="card-meta">
                <strong>Condition:</strong> {trial.condition}
              </p>
              <p className="card-meta">
                <strong>Phase:</strong> {trial.phase} | <strong>Status:</strong> {trial.status}
              </p>
              {trial.location && (
                <p className="card-meta">
                  <strong>Location:</strong> {trial.location}
                </p>
              )}
              <p className="card-description">
                {trial.description?.substring(0, 200)}...
              </p>
              {trial.ai_summary && (
                <div className="ai-summary">
                  <strong>AI Summary:</strong> {trial.ai_summary}
                </div>
              )}
              {trial.eligibility_criteria && (
                <details className="eligibility">
                  <summary>Eligibility Criteria</summary>
                  <p>{trial.eligibility_criteria}</p>
                </details>
              )}
              <div className="card-actions">
                <button
                  onClick={() => handleAddFavorite(trial.id)}
                  className="secondary-button"
                >
                  Add to Favorites
                </button>
                <button
                  onClick={() => handleContactTrial(trial)}
                  className="primary-button"
                >
                  Contact Trial
                </button>
              </div>
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

