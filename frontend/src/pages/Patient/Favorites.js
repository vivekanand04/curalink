import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [favoriteDetails, setFavoriteDetails] = useState([]);
  const [expandedAISummaries, setExpandedAISummaries] = useState({});
  const [showAISummary, setShowAISummary] = useState(null);
  const [showMeetingForm, setShowMeetingForm] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    patientName: '',
    patientContact: '',
    message: '',
  });

  useEffect(() => {
    fetchFavorites();
  }, [filter]);

  useEffect(() => {
    if (favorites.length > 0 && !loading) {
      fetchFavoriteDetails();
    } else if (favorites.length === 0) {
      // Clear details immediately when favorites are empty
      setFavoriteDetails([]);
      setDetailsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  const fetchFavorites = async () => {
    setLoading(true);
    // Clear old details immediately to prevent showing stale data
    setFavoriteDetails([]);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await axios.get(`${API_URL}/favorites`, { params, headers });
      setFavorites(response.data);
    } catch (error) {
      toast.error('Failed to fetch favorites');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteDetails = async () => {
    setDetailsLoading(true);
    // Clear old details before fetching new ones
    setFavoriteDetails([]);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const detailsPromises = favorites.map(async (fav) => {
        try {
          if (fav.item_type === 'clinical_trial') {
            const response = await axios.get(`${API_URL}/clinical-trials`, { headers });
            const trial = response.data.find(t => t.id === fav.item_id);
            return trial ? { ...trial, favoriteId: fav.id, itemType: 'clinical_trial' } : null;
          } else if (fav.item_type === 'publication') {
            const response = await axios.get(`${API_URL}/publications`, { headers });
            const pub = response.data.find(p => p.id === fav.item_id);
            return pub ? { ...pub, favoriteId: fav.id, itemType: 'publication' } : null;
          } else if (fav.item_type === 'expert') {
            const response = await axios.get(`${API_URL}/experts`, { headers });
            const expert = response.data.find(e => e.id === fav.item_id);
            return expert ? { ...expert, favoriteId: fav.id, itemType: 'expert' } : null;
          }
        } catch (error) {
          console.error(`Error fetching ${fav.item_type} ${fav.item_id}:`, error);
          return null;
        }
      });

      const details = await Promise.all(detailsPromises);
      setFavoriteDetails(details.filter(item => item !== null));
    } catch (error) {
      console.error('Error fetching favorite details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRemoveFavorite = async (itemType, itemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/favorites/${itemType}/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Removed from favorites');
      fetchFavorites();
    } catch (error) {
      toast.error('Failed to remove from favorites');
    }
  };

  const handleToggleFavorite = async (itemType, itemId) => {
    await handleRemoveFavorite(itemType, itemId);
  };

  const handleContactTrial = (trial) => {
    const subject = encodeURIComponent(`Inquiry about: ${trial.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI am interested in learning more about this clinical trial:\n\n${trial.title}\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const toggleAISummary = (itemId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleShowAISummary = (item) => {
    if (item.ai_summary) {
      setShowAISummary(item);
    } else {
      toast.info('AI summary not available');
    }
  };

  const handleFollowExpert = async (expertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/experts/${expertId}/follow`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Expert followed successfully');
    } catch (error) {
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

  const filteredDetails = filter === 'all' 
    ? favoriteDetails 
    : favoriteDetails.filter(item => item.itemType === filter);

  return (
    <div className="page-content">
      <h1>My Favorites</h1>
      <p className="subtitle">Your saved items for quick access</p>

      <div className="filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'clinical_trial' ? 'active' : ''}
          onClick={() => setFilter('clinical_trial')}
        >
          Clinical Trials
        </button>
        <button
          className={filter === 'publication' ? 'active' : ''}
          onClick={() => setFilter('publication')}
        >
          Publications
        </button>
        <button
          className={filter === 'expert' ? 'active' : ''}
          onClick={() => setFilter('expert')}
        >
          Health Experts
        </button>
      </div>

      {loading || detailsLoading ? (
        <p>Loading favorites...</p>
      ) : (
        <div className="cards-grid recommended-grid">
          {filteredDetails.map((item) => {
            if (item.itemType === 'clinical_trial') {
              return (
                <div key={item.favoriteId} className="card modern-card trial-card">
                  <div className="card-favorite-icon" onClick={() => handleToggleFavorite('clinical_trial', item.id)}>
                    <span className="star-icon star-filled">★</span>
                  </div>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-scope">{item.location || 'Global'}</p>
                  <span className={`status-tag status-${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {item.status}
                  </span>
                  <p className="card-description">
                    {item.description || `A trial on ${item.condition || 'medical research'}.`}
                  </p>
                  <div className="card-actions-row">
                    <span className="action-link" onClick={() => handleContactTrial(item)}>
                      Contact Trial
                    </span>
                    <span className="action-link" onClick={() => toggleAISummary(item.id)}>
                      {expandedAISummaries[item.id] ? 'Hide AI Summary' : 'Get AI Summary'}
                    </span>
                  </div>
                  {expandedAISummaries[item.id] && item.ai_summary && (
                    <div className="ai-summary-container">
                      <div className="ai-summary-content">
                        {item.ai_summary}
                      </div>
                    </div>
                  )}
                </div>
              );
            } else if (item.itemType === 'publication') {
              return (
                <div key={item.favoriteId} className="card modern-card publication-card">
                  <div className="card-favorite-icon" onClick={() => handleToggleFavorite('publication', item.id)}>
                    <span className="star-icon star-filled">★</span>
                  </div>
                  <h3 className="card-title">{item.title}</h3>
                  {item.journal && item.publication_date && (
                    <p className="card-source">
                      {item.journal} • {new Date(item.publication_date).getFullYear()}
                    </p>
                  )}
                  {item.authors && item.authors.length > 0 && (
                    <p className="card-authors">
                      By {item.authors.slice(0, 2).map(author => author.includes('Dr.') ? author : `Dr. ${author}`).join(', ')}
                      {item.authors.length > 2 && ' et al.'}
                    </p>
                  )}
                  <div className="card-actions-row">
                    {item.full_text_url && (
                      <span className="action-link">
                        <a
                          href={item.full_text_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Full Paper
                        </a>
                      </span>
                    )}
                    <span className="action-link" onClick={() => handleShowAISummary(item)}>
                      Get AI Summary
                    </span>
                  </div>
                </div>
              );
            } else if (item.itemType === 'expert') {
              return (
                <div key={item.favoriteId} className="card modern-card expert-card">
                  <div className="card-favorite-icon" onClick={() => handleToggleFavorite('expert', item.id)}>
                    <span className="star-icon star-filled">★</span>
                  </div>
                  <h3 className="card-title">{item.name || 'Expert'}</h3>
                  <p className="card-affiliation">
                    {item.specialties && item.specialties.length > 0 
                      ? `${item.specialties[0]}${item.location ? ` at ${item.location}` : ''}`
                      : item.location || 'Health Expert'}
                  </p>
                  {item.research_interests && item.research_interests.length > 0 && (
                    <>
                      <p className="card-section-label">Research Interests:</p>
                      <div className="interests-tags">
                        {item.research_interests.slice(0, 3).map((interest, idx) => (
                          <span key={idx} className="interest-tag">{interest}</span>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="card-actions-buttons">
                    <button
                      onClick={() => handleFollowExpert(item.id)}
                      className="follow-button"
                    >
                      Follow
                    </button>
                    {item.is_platform_member && (
                      <button
                        onClick={() => setShowMeetingForm(item.id)}
                        className="request-meeting-button"
                      >
                        Request Meeting
                      </button>
                    )}
                  </div>
                  {showMeetingForm === item.id && (
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
                          onClick={() => handleRequestMeeting(item.id)}
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
              );
            }
            return null;
          })}
        </div>
      )}

      {showAISummary && (
        <div className="modal-overlay" onClick={() => setShowAISummary(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>AI Summary</h2>
              <button className="modal-close" onClick={() => setShowAISummary(null)}>×</button>
            </div>
            <div className="modal-body">
              <h3>{showAISummary.title}</h3>
              <p>{showAISummary.ai_summary || 'AI summary not available.'}</p>
            </div>
          </div>
        </div>
      )}

      {filteredDetails.length === 0 && !loading && !detailsLoading && (
        <p className="empty-state">
          No favorites found. Start saving items to see them here.
        </p>
      )}
    </div>
  );
};

export default Favorites;

