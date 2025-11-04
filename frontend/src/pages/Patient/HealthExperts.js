import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const HealthExperts = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // favorite experts (star)
  const [followedExperts, setFollowedExperts] = useState(new Set());
  // following state (independent from favorites)
  const [followingExperts, setFollowingExperts] = useState(() => {
    try {
      const raw = localStorage.getItem('followingExperts');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  });
  const [showMeetingModal, setShowMeetingModal] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    patientName: '',
    patientContact: '',
    message: '',
  });
  const [nudged, setNudged] = useState(() => new Set());

  useEffect(() => {
    fetchExperts();
    fetchFollowedExperts();
  }, []);

  const fetchFollowedExperts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const response = await axios.get(`${API_URL}/favorites`, {
        params: { type: 'expert' },
        headers
      });
      const followedIds = new Set(response.data.map(fav => fav.item_id));
      setFollowedExperts(followedIds);
    } catch (error) {
      console.error('Error fetching followed experts:', error);
    }
  };

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch platform-joined experts only
      const response = await axios.get(`${API_URL}/experts`, { headers });
      setExperts(response.data || []);
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
      setExperts(response.data || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Toggle following (UI-only, decoupled from favorites)
  const handleFollow = (expertId) => {
    setFollowingExperts(prev => {
      const next = new Set(prev);
      if (next.has(expertId)) {
        next.delete(expertId);
        toast.success('Unfollowed');
      } else {
        next.add(expertId);
        toast.success('Following');
      }
      try { localStorage.setItem('followingExperts', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  // Toggle favorites for expert (star icon)
  const toggleFavoriteExpert = async (expertId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      if (followedExperts.has(expertId)) {
        await axios.delete(`${API_URL}/favorites/expert/${expertId}`, { headers });
        setFollowedExperts(prev => { const n = new Set(prev); n.delete(expertId); return n; });
      } else {
        await axios.post(`${API_URL}/favorites`, { itemType: 'expert', itemId: expertId }, { headers });
        setFollowedExperts(prev => new Set(prev).add(expertId));
      }
    } catch {
      toast.error('Failed to update favourites');
      }
  };

  const handleNudge = (expertId) => {
    setNudged(prev => {
      const next = new Set(prev);
      next.add(expertId);
      return next;
    });
    toast.success('Nudge sent');
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

      // Find expert and determine availability from backend data
      const expert = experts.find(e => e.id === expertId);
      const isImported = !!expert?.external_source;
      const isActive = !!expert?.availability_for_meetings;
      const expertName = expert?.name || 'Researcher';

      if (isImported) {
        // Imported expert: route to owner (handled server-side via null expert_id) and show popup
        toast.info(`${expertName} is not active on the platform; the message has been sent to the owner.`);
      } else if (isActive) {
        toast.success(`Request sent to ${expertName} successfully.`);
        // Store in localStorage so researcher Meeting Requests can read (UI only)
        try {
          const stored = JSON.parse(localStorage.getItem('meetingRequests') || '[]');
          const newReq = {
            id: Date.now(),
            name: meetingForm.patientName,
            contact: meetingForm.patientContact,
            reason: meetingForm.message || '—',
            datetime: new Date().toISOString().slice(0,16).replace('T',' '),
            status: 'pending',
          };
          stored.unshift(newReq);
          localStorage.setItem('meetingRequests', JSON.stringify(stored));
        } catch {}
      } else {
        toast.info('Researcher is not active to accept meetings; request sent to OWNER successfully.');
      }
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
        <button onClick={handleSearch} className="primary-button search-button">Search</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
          {experts.map((expert) => (
            <div key={expert.id} className="card modern-card expert-card">
              <div className="card-favorite-icon" onClick={() => toggleFavoriteExpert(expert.id)}>
                <span className={`star-icon ${followedExperts.has(expert.id) ? 'star-filled' : ''}`}>
                  {followedExperts.has(expert.id) ? '★' : '☆'}
                </span>
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
                  className={`follow-button ${followedExperts.has(expert.id) ? 'following' : ''}`}
                >
                  {followingExperts.has(expert.id) ? 'Following' : 'Follow'}
                </button>
                {expert.external_source ? (
                  <>
                    <button
                      onClick={() => setShowMeetingModal(expert.id)}
                      className="request-meeting-button"
                    >
                      Request Meeting
                    </button>
                    <button
                      onClick={() => handleNudge(expert.id)}
                      className="secondary-button"
                    >
                      {nudged.has(expert.id) ? 'Nudge Sent' : 'Nudge to Join'}
                    </button>
                  </>
                ) : (
                  expert.is_platform_member && (
                  <button
                    onClick={() => setShowMeetingModal(expert.id)}
                    className="request-meeting-button"
                  >
                    Request Meeting
                  </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showMeetingModal && (
        <div className="modal-overlay" onClick={() => {
          setShowMeetingModal(null);
          setMeetingForm({ patientName: '', patientContact: '', message: '' });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request a Meeting</h2>
              <button className="modal-close" onClick={() => {
                setShowMeetingModal(null);
                setMeetingForm({ patientName: '', patientContact: '', message: '' });
              }}>×</button>
            </div>
            <div className="modal-body">
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
                  rows="4"
                />
              </div>
              <div className="form-actions">
                <button
                  onClick={() => {
                    setShowMeetingModal(null);
                    setMeetingForm({ patientName: '', patientContact: '', message: '' });
                  }}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleRequestMeeting(showMeetingModal);
                    setShowMeetingModal(null);
                    setMeetingForm({ patientName: '', patientContact: '', message: '' });
                  }}
                  className="primary-button"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {experts.length === 0 && !loading && (
        <p className="empty-state">No experts found. Try adjusting your search.</p>
      )}
    </div>
  );
};

export default HealthExperts;

