import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import '../Dashboard.css';
import { normalizeOrFallback } from '../../utils/conditionNormalizer';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PatientOnboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    conditions: [],
    currentCondition: '',
    locationCity: '',
    locationCountry: '',
    symptoms: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const addCondition = () => {
    const input = formData.currentCondition;
    if (!input || !input.trim()) return;

    const normalizedList = normalizeOrFallback(input);

    const existing = new Set((formData.conditions || []).map((c) => c.trim()));
    for (const label of normalizedList) {
      if (!existing.has(label)) {
        existing.add(label);
      }
    }

    setFormData({
      ...formData,
      conditions: Array.from(existing),
      currentCondition: '',
    });
  };

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.age || formData.conditions.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Not authenticated. Please login again.');
        navigate('/login');
        return;
      }

      await axios.post(`${API_URL}/patients/profile`, {
        name: formData.name,
        age: parseInt(formData.age),
        conditions: formData.conditions,
        locationCity: formData.locationCity,
        locationCountry: formData.locationCountry,
        symptoms: formData.symptoms,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Profile created successfully!');
      navigate('/patient/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div style={{ height: 6, background: '#eef1f7', borderRadius: 999, overflow: 'hidden', marginBottom: 12, position: 'relative' }} aria-hidden>
          <div style={{ height: '100%', width: '66%', background: 'linear-gradient(90deg,#667eea 0%, #34A853 100%)', borderRadius: 999 }} />
          <div style={{ position: 'absolute', top: '50%', left: '33%', transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: 999, background: '#fff', border: '2px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '66%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: 999, background: '#fff', border: '2px solid #cbd5e1' }} />
        </div>
        
        <h1>Complete Your Profile</h1>
        <p className="subtitle">Help us personalize your experience</p>

        <div className="onboarding-form">
          {step === 1 && (
            <div className="form-section">
              <h2>Personal Information</h2>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              <div className="form-group">
                <label>Age *</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Enter your age"
                  min="1"
                  max="120"
                />
              </div>
              <div className="form-group">
                <label>Medical Conditions *</label>
                <div className="condition-input">
                  <input
                    type="text"
                    value={formData.currentCondition}
                    onChange={(e) => setFormData({ ...formData, currentCondition: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                    placeholder="Describe your condition in your own words (e.g., I have pain in my lungs, I feel dizzy often)"
                  />
                  <button type="button" onClick={addCondition} className="add-button">
                    Add
                  </button>
                </div>
                <div className="conditions-list">
                  {formData.conditions.map((condition, index) => (
                    <span key={index} className="condition-tag">
                      {condition}
                      <button type="button" onClick={() => removeCondition(index)}>×</button>
                    </span>
                  ))}
                </div>
                <small>You can add multiple conditions to get better recommendations</small>
              </div>
              <button className="primary-button" onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="form-section">
              <h2>Location & Symptoms</h2>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.locationCity}
                  onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                  placeholder="Enter your city"
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.locationCountry}
                  onChange={(e) => setFormData({ ...formData, locationCountry: e.target.value })}
                  placeholder="Enter your country"
                />
              </div>
              <div className="form-group">
                <label>Symptoms (Optional)</label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  placeholder="Describe your symptoms in natural language"
                  rows="4"
                />
              </div>
              <div className="form-actions">
                <button className="secondary-button" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  className="primary-button"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientOnboarding;

