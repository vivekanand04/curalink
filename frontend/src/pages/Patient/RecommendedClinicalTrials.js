import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RecommendedClinicalTrials = () => {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchTrials();
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

  const fetchTrials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch ONLY personalized trials
      const response = await axios.get(`${API_URL}/clinical-trials/personalized`, { headers });
      setTrials(response.data || []);
    } catch (error) {
      console.error('Error fetching personalized trials:', error);
      toast.error('Failed to fetch recommended clinical trials');
      setTrials([]);
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
    const subject = encodeURIComponent(`Inquiry about: ${trial.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI am interested in learning more about this clinical trial:\n\n${trial.title}\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="recommended-page">
      <div className="recommended-page-header">
        <button className="back-button" onClick={() => navigate('/patient/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>
          {profile?.conditions && profile.conditions.length > 0 
            ? `Recommended Clinical Trials for ${profile.conditions.join(', ')}`
            : 'Recommended Clinical Trials'}
        </h1>
        <p className="subtitle">
          {profile?.conditions && profile.conditions.length > 0 
            ? `Clinical trials tailored to your conditions: ${profile.conditions.join(', ')}`
            : 'Complete your profile to get personalized recommendations'}
        </p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading recommended clinical trials...</p>
        </div>
      ) : trials.length > 0 ? (
        <div className="cards-grid recommended-grid">
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
                <span className="action-link" onClick={() => {
                  if (trial.ai_summary) {
                    alert(`AI Summary:\n\n${trial.ai_summary}`);
                  } else {
                    alert('AI summary not available for this trial');
                  }
                }}>
                  Get AI Summary
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-container">
          <p className="empty-state">
            {profile?.conditions && profile.conditions.length > 0
              ? 'No recommended clinical trials found for your conditions. Try updating your profile or check back later.'
              : 'Complete your profile with your conditions to get personalized clinical trial recommendations.'}
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

export default RecommendedClinicalTrials;

