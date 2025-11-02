import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const HealthExperts = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMeetingForm, setShowMeetingForm] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    patientName: '',
    patientContact: '',
    message: '',
  });

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch all experts initially
      const response = await axios.get(`${API_URL}/experts`, { headers });
      setExperts(response.data);
    } catch (error) {
      toast.error('Failed to fetch experts');
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
      
      const response = await axios.get(`${API_URL}/experts/search`, {
        params: { query: searchQuery },
        headers
      });
      setExperts(response.data);
    } catch (error) {
      toast.error('Search failed');
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
      // If it's a favorite action, just show message
      if (error.response?.status === 404 || error.response?.status === 409) {
        toast.info('Expert bookmarked');
      } else {
        toast.error('Failed to follow expert');
      }
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
    <div className="page-content">
      <h1>Health Experts</h1>
      <p className="subtitle">Find and connect with health experts in your field</p>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name, specialty, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="primary-button">Search</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
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
                  <div className="form-group">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      value={meetingForm.patientName}
                      onChange={(e) =>
                        setMeetingForm({ ...meetingForm, patientName: e.target.value })
                      }
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Information *</label>
                    <input
                      type="text"
                      value={meetingForm.patientContact}
                      onChange={(e) =>
                        setMeetingForm({ ...meetingForm, patientContact: e.target.value })
                      }
                      placeholder="Email or phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Message (Optional)</label>
                    <textarea
                      value={meetingForm.message}
                      onChange={(e) =>
                        setMeetingForm({ ...meetingForm, message: e.target.value })
                      }
                      placeholder="Add any additional details..."
                      rows="3"
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      onClick={() => setShowMeetingForm(null)}
                      className="secondary-button"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRequestMeeting(expert.id)}
                      className="primary-button"
                    >
                      Send Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {experts.length === 0 && !loading && (
        <p className="empty-state">No experts found. Try adjusting your search.</p>
      )}
    </div>
  );
};

export default HealthExperts;

