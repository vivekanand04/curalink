import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import '../Dashboard.css';

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
    if (formData.currentCondition.trim()) {
      setFormData({
        ...formData,
        conditions: [...formData.conditions, formData.currentCondition.trim()],
        currentCondition: '',
      });
    }
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
                    placeholder="e.g., Brain Cancer, Glioma"
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

