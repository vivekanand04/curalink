import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ClinicalTrialsManage = () => {
  const [trials, setTrials] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrial, setEditingTrial] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    condition: '',
    phase: '',
    status: 'recruiting',
    location: '',
    eligibilityCriteria: '',
    currentParticipants: 0,
    targetParticipants: '',
  });
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [expandedAISummaries, setExpandedAISummaries] = useState({});

  useEffect(() => {
    fetchTrials();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const favoritesMap = {};
      response.data.forEach(fav => {
        if (fav.item_type === 'clinical_trial') {
          favoritesMap[`clinical_trial_${fav.item_id}`] = true;
        }
      });
      setFavorites(favoritesMap);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchTrials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/clinical-trials/my-trials`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTrials(response.data);
    } catch (error) {
      toast.error('Failed to fetch clinical trials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.condition) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      if (editingTrial) {
        await axios.put(`${API_URL}/clinical-trials/${editingTrial.id}`, formData, { headers });
        toast.success('Clinical trial updated successfully');
      } else {
        await axios.post(`${API_URL}/clinical-trials`, formData, { headers });
        toast.success('Clinical trial created successfully');
      }
      handleCancelForm();
      fetchTrials();
      fetchFavorites();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save clinical trial');
    }
  };

  const handleEdit = (trial) => {
    setEditingTrial(trial);
    setFormData({
      title: trial.title,
      description: trial.description,
      condition: trial.condition,
      phase: trial.phase,
      status: trial.status,
      location: trial.location,
      eligibilityCriteria: trial.eligibility_criteria || '',
      currentParticipants: trial.current_participants || 0,
      targetParticipants: trial.target_participants || '',
    });
    setShowForm(true);
  };

  const handleToggleFavorite = async (trialId) => {
    try {
      const token = localStorage.getItem('token');
      const isFavorite = favorites[`clinical_trial_${trialId}`];
      
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`${API_URL}/favorites/clinical_trial/${trialId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setFavorites(prev => {
          const newFavs = { ...prev };
          delete newFavs[`clinical_trial_${trialId}`];
          return newFavs;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        await axios.post(`${API_URL}/favorites`, {
          itemType: 'clinical_trial',
          itemId: trialId,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setFavorites(prev => ({
          ...prev,
          [`clinical_trial_${trialId}`]: true
        }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update favorites');
    }
  };

  const toggleAISummary = (trialId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [trialId]: !prev[trialId]
    }));
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTrial(null);
    setFormData({
      title: '',
      description: '',
      condition: '',
      phase: '',
      status: 'recruiting',
      location: '',
      eligibilityCriteria: '',
      currentParticipants: 0,
      targetParticipants: '',
    });
  };

  const handleDelete = async (trialId) => {
    if (!window.confirm('Are you sure you want to delete this clinical trial?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/clinical-trials/${trialId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Clinical trial deleted successfully');
      fetchTrials();
    } catch (error) {
      toast.error('Failed to delete clinical trial');
    }
  };

  return (
    <div className="page-content">
      <div className="forums-header">
        <h1>Manage Clinical Trials</h1>
        <button onClick={() => setShowForm(true)} className="primary-button">
          Add
        </button>
      </div>
      <p className="subtitle">Create and manage your clinical trials</p>

      {showForm && (
        <div className="modal-overlay" onClick={() => {
          handleCancelForm();
        }}>
          <div className="modal-content clinical-trial-form" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingTrial ? 'Edit Clinical Trial' : 'Create New Clinical Trial'}</h2>
              <button 
                className="close-button" 
                onClick={handleCancelForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="title">Title <span className="required">*</span></label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter trial title"
                    required
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="description">Description <span className="required">*</span></label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the clinical trial, its objectives, and methodology"
                    rows="5"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="condition">Condition <span className="required">*</span></label>
                  <input
                    id="condition"
                    type="text"
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    placeholder="e.g., Brain Cancer, Diabetes"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phase">Phase</label>
                  <select
                    id="phase"
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  >
                    <option value="">Select phase</option>
                    <option value="Phase 1">Phase 1</option>
                    <option value="Phase 2">Phase 2</option>
                    <option value="Phase 3">Phase 3</option>
                    <option value="Phase 4">Phase 4</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="recruiting">Recruiting</option>
                    <option value="not yet recruiting">Not Yet Recruiting</option>
                    <option value="completed">Completed</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="location">Location</label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., New York, USA"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="eligibilityCriteria">Eligibility Criteria</label>
                  <textarea
                    id="eligibilityCriteria"
                    value={formData.eligibilityCriteria}
                    onChange={(e) => setFormData({ ...formData, eligibilityCriteria: e.target.value })}
                    placeholder="Describe inclusion and exclusion criteria for participants"
                    rows="4"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="currentParticipants">Current Participants</label>
                  <input
                    id="currentParticipants"
                    type="number"
                    value={formData.currentParticipants}
                    onChange={(e) => setFormData({ ...formData, currentParticipants: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="targetParticipants">Target Participants</label>
                  <input
                    id="targetParticipants"
                    type="number"
                    value={formData.targetParticipants}
                    onChange={(e) => setFormData({ ...formData, targetParticipants: e.target.value ? parseInt(e.target.value) : '' })}
                    placeholder="Optional"
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingTrial ? 'Update Trial' : 'Create Trial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {(trial.current_participants !== undefined || trial.target_participants) && trial.target_participants && (
                <div className="recruitment-progress">
                  <div className="progress-header">
                    <span className="progress-label">Progress</span>
                    <span className="progress-count">
                      {trial.current_participants || 0} / {trial.target_participants}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${Math.min(((trial.current_participants || 0) / trial.target_participants) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
              <p className="card-description">
                {trial.description || `A trial on ${trial.condition || 'medical research'}.`}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span className="action-link" onClick={() => handleEdit(trial)}>
                    Edit
                  </span>
                  <span className="action-link" onClick={() => handleDelete(trial.id)} style={{ color: '#dc3545' }}>
                    Delete
                  </span>
                </div>
                <span className="action-link" onClick={() => toggleAISummary(trial.id)}>
                  {expandedAISummaries[trial.id] ? 'Hide AI Summary' : 'Get AI Summary'}
                </span>
              </div>
              {expandedAISummaries[trial.id] && trial.ai_summary && (
                <div className="ai-summary-container">
                  <div className="ai-summary-content">
                    {trial.ai_summary}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {trials.length === 0 && !loading && (
        <p className="empty-state">No clinical trials yet. Create your first trial!</p>
      )}
    </div>
  );
};

export default ClinicalTrialsManage;

