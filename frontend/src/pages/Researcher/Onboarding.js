import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResearcherOnboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    specialties: [],
    currentSpecialty: '',
    researchInterests: [],
    currentInterest: '',
    orcidId: '',
    researchgateId: '',
    availabilityForMeetings: false,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const addSpecialty = () => {
    if (formData.currentSpecialty.trim()) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, formData.currentSpecialty.trim()],
        currentSpecialty: '',
      });
    }
  };

  const removeSpecialty = (index) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index),
    });
  };

  const addInterest = () => {
    if (formData.currentInterest.trim()) {
      setFormData({
        ...formData,
        researchInterests: [...formData.researchInterests, formData.currentInterest.trim()],
        currentInterest: '',
      });
    }
  };

  const removeInterest = (index) => {
    setFormData({
      ...formData,
      researchInterests: formData.researchInterests.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.specialties.length === 0) {
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

      await axios.post(`${API_URL}/researchers/profile`, {
        name: formData.name,
        specialties: formData.specialties,
        researchInterests: formData.researchInterests,
        orcidId: formData.orcidId || null,
        researchgateId: formData.researchgateId || null,
        availabilityForMeetings: formData.availabilityForMeetings,
        publications: [], // Will be auto-imported if ORCID/ResearchGate provided
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Profile created successfully!');
      navigate('/researcher/dashboard');
    } catch (error) {
      console.error('Error creating profile:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to create profile';
      toast.error(errorMessage);
      if (error.response?.status === 500) {
        console.error('Server error details:', error.response?.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h1>Complete Your Researcher Profile</h1>
        <p className="subtitle">Help us connect you with relevant opportunities</p>

        <div className="onboarding-form">
          {step === 1 && (
            <div className="form-section">
              <h2>Personal & Professional Information</h2>
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
                <label>Specialties *</label>
                <div className="condition-input">
                  <input
                    type="text"
                    value={formData.currentSpecialty}
                    onChange={(e) => setFormData({ ...formData, currentSpecialty: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                    placeholder="e.g., Oncology, Neurology, Immunology"
                  />
                  <button type="button" onClick={addSpecialty} className="add-button">
                    Add
                  </button>
                </div>
                <div className="conditions-list">
                  {formData.specialties.map((specialty, index) => (
                    <span key={index} className="condition-tag">
                      {specialty}
                      <button type="button" onClick={() => removeSpecialty(index)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Research Interests</label>
                <div className="condition-input">
                  <input
                    type="text"
                    value={formData.currentInterest}
                    onChange={(e) => setFormData({ ...formData, currentInterest: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                    placeholder="e.g., Immunotherapy, Clinical AI, Gene Therapy"
                  />
                  <button type="button" onClick={addInterest} className="add-button">
                    Add
                  </button>
                </div>
                <div className="conditions-list">
                  {formData.researchInterests.map((interest, index) => (
                    <span key={index} className="condition-tag">
                      {interest}
                      <button type="button" onClick={() => removeInterest(index)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <button className="primary-button" onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="form-section">
              <h2>Additional Information</h2>
              <div className="form-group">
                <label>ORCID ID (Optional)</label>
                <input
                  type="text"
                  value={formData.orcidId}
                  onChange={(e) => setFormData({ ...formData, orcidId: e.target.value })}
                  placeholder="Enter your ORCID ID"
                />
                <small>We'll auto-import your publications from ORCID</small>
              </div>
              <div className="form-group">
                <label>ResearchGate ID (Optional)</label>
                <input
                  type="text"
                  value={formData.researchgateId}
                  onChange={(e) => setFormData({ ...formData, researchgateId: e.target.value })}
                  placeholder="Enter your ResearchGate profile ID"
                />
                <small>We'll auto-import your academic contributions</small>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.availabilityForMeetings}
                    onChange={(e) =>
                      setFormData({ ...formData, availabilityForMeetings: e.target.checked })
                    }
                  />
                  Available for meetings with patients
                </label>
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

export default ResearcherOnboarding;

