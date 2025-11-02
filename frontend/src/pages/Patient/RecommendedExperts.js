import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RecommendedExperts = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showMeetingForm, setShowMeetingForm] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    patientName: '',
    patientContact: '',
    message: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchExperts();
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

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch ONLY personalized experts
      const response = await axios.get(`${API_URL}/experts/personalized`, { headers });
      setExperts(response.data || []);
    } catch (error) {
      console.error('Error fetching personalized experts:', error);
      toast.error('Failed to fetch recommended experts');
      setExperts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (expertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/experts/${expertId}/follow`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Expert followed successfully');
    } catch (error) {
      toast.error('Failed to follow expert');
    }
  };

  const handleRequestMeeting = async (expertId) => {
    if (!meetingForm.patientName || !meetingForm.patientContact) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/experts/${expertId}/meeting-request`, meetingForm, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Meeting request sent successfully');
      setShowMeetingForm(null);
      setMeetingForm({ patientName: '', patientContact: '', message: '' });
    } catch (error) {
      toast.error('Failed to send meeting request');
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
            ? `Recommended Health Experts for ${profile.conditions.join(', ')}`
            : 'Recommended Health Experts'}
        </h1>
        <p className="subtitle">
          {profile?.conditions && profile.conditions.length > 0 
            ? `Health experts and researchers specialized in your conditions: ${profile.conditions.join(', ')}`
            : 'Complete your profile to get personalized expert recommendations'}
        </p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading recommended experts...</p>
        </div>
      ) : experts.length > 0 ? (
        <div className="cards-grid recommended-grid">
          {experts.map((expert) => (
            <div key={expert.id} className="card modern-card expert-card">
              <div className="card-favorite-icon" onClick={() => handleFollow(expert.id)}>
                <span className="star-icon">☆</span>
              </div>
              <h3 className="card-title">{expert.name || 'Expert'}</h3>
              <p className="card-affiliation">
                {expert.specialties && expert.specialties.length > 0 
                  ? `${expert.specialties[0]}${expert.location ? ` at ${expert.location}` : ''}`
                  : expert.location || 'Health Expert'}
              </p>
              {expert.research_interests && expert.research_interests.length > 0 && (
                <>
                  <p className="card-section-label">Research Interests:</p>
                  <div className="interests-tags">
                    {expert.research_interests.slice(0, 3).map((interest, idx) => (
                      <span key={idx} className="interest-tag">{interest}</span>
                    ))}
                  </div>
                </>
              )}
              <div className="card-actions-buttons">
                <button
                  onClick={() => handleFollow(expert.id)}
                  className="follow-button"
                >
                  Follow
                </button>
                {expert.is_platform_member && (
                  <button
                    onClick={() => setShowMeetingForm(expert.id)}
                    className="request-meeting-button"
                  >
                    Request Meeting
                  </button>
                )}
              </div>
              {showMeetingForm === expert.id && (
                <div className="meeting-form">
                  <h4>Request a Meeting</h4>
                  <input
                    type="text"
                    placeholder="Your Name *"
                    value={meetingForm.patientName}
                    onChange={(e) => setMeetingForm({ ...meetingForm, patientName: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Your Contact *"
                    value={meetingForm.patientContact}
                    onChange={(e) => setMeetingForm({ ...meetingForm, patientContact: e.target.value })}
                  />
                  <textarea
                    placeholder="Message (optional)"
                    value={meetingForm.message}
                    onChange={(e) => setMeetingForm({ ...meetingForm, message: e.target.value })}
                  />
                  <div className="form-actions">
                    <button
                      onClick={() => handleRequestMeeting(expert.id)}
                      className="primary-button"
                    >
                      Send Request
                    </button>
                    <button
                      onClick={() => {
                        setShowMeetingForm(null);
                        setMeetingForm({ patientName: '', patientContact: '', message: '' });
                      }}
                      className="secondary-button"
                    >
                      Cancel
                    </button>
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
              ? 'No recommended experts found for your conditions. Try updating your profile or check back later.'
              : 'Complete your profile with your conditions to get personalized expert recommendations.'}
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

export default RecommendedExperts;

