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
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrials();
  }, []);

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
      });
      fetchTrials();
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
    });
    setShowForm(true);
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
          Add New Trial
        </button>
      </div>
      <p className="subtitle">Create and manage your clinical trials</p>

      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false);
          setEditingTrial(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTrial ? 'Edit Clinical Trial' : 'Add New Clinical Trial'}</h2>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter trial title"
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the clinical trial"
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Condition *</label>
              <input
                type="text"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="e.g., Brain Cancer"
              />
            </div>
            <div className="form-group">
              <label>Phase</label>
              <select
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
              <label>Status</label>
              <select
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
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location"
              />
            </div>
            <div className="form-group">
              <label>Eligibility Criteria</label>
              <textarea
                value={formData.eligibilityCriteria}
                onChange={(e) => setFormData({ ...formData, eligibilityCriteria: e.target.value })}
                placeholder="Describe eligibility criteria"
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingTrial(null);
                }}
                className="secondary-button"
              >
                Cancel
              </button>
              <button onClick={handleSubmit} className="primary-button">
                {editingTrial ? 'Update' : 'Create'} Trial
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p className="card-description">{trial.description?.substring(0, 200)}...</p>
              {trial.ai_summary && (
                <div className="ai-summary">
                  <strong>AI Summary:</strong> {trial.ai_summary}
                </div>
              )}
              <div className="card-actions">
                <button
                  onClick={() => handleEdit(trial)}
                  className="secondary-button"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(trial.id)}
                  className="danger-button"
                >
                  Delete
                </button>
              </div>
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

