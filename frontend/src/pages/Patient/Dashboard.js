import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import '../Dashboard.css';
import HealthExperts from './HealthExperts';
import ClinicalTrials from './ClinicalTrials';
import Publications from './Publications';
import Forums from './Forums';
import Favorites from './Favorites';
import ProfileModal from '../../components/ProfileModal';
import AccountTypeModal from '../../components/AccountTypeModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [accountTypeModalOpen, setAccountTypeModalOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [clinicalTrials, setClinicalTrials] = useState([]);
  const [publications, setPublications] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState({
    experts: 0,
    clinicalTrials: 0,
    publications: 0,
    discussions: 0
  });
  const [recentPosts, setRecentPosts] = useState([]);
  const [showAISummary, setShowAISummary] = useState(null);
  const [favorites, setFavorites] = useState({}); // Track favorites: { 'clinical_trial_1': true, 'expert_2': true, etc. }
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard' && profile) {
      fetchDashboardData();
    }
  }, [activeTab, profile]);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const response = await axios.get(`${API_URL}/favorites`, { headers });
      const favoritesMap = {};
      response.data.forEach(fav => {
        const key = `${fav.item_type}_${fav.item_id}`;
        favoritesMap[key] = true;
      });
      setFavorites(favoritesMap);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handleToggleFavorite = async (itemType, itemId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const key = `${itemType}_${itemId}`;
      
      if (favorites[key]) {
        // Remove from favorites
        await axios.delete(`${API_URL}/favorites/${itemType}/${itemId}`, { headers });
        setFavorites(prev => {
          const newFavs = { ...prev };
          delete newFavs[key];
          return newFavs;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        await axios.post(`${API_URL}/favorites`, {
          itemType: itemType === 'expert' ? 'expert' : itemType,
          itemId: itemId,
        }, { headers });
        setFavorites(prev => ({ ...prev, [key]: true }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
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

  const [showMeetingForm, setShowMeetingForm] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    patientName: '',
    patientContact: '',
    message: '',
  });

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

  const fetchDashboardData = async () => {
    await Promise.all([
      fetchPersonalizedData(),
      fetchStats(),
      fetchRecentPosts()
    ]);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/forums/recent-posts?limit=3`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setRecentPosts(response.data || []);
    } catch (error) {
      console.error('Error fetching recent posts:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/patients/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Object.keys(response.data).length > 0) {
        setProfile(response.data);
      } else {
        // Profile doesn't exist, redirect to onboarding
        navigate('/patient/onboarding');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If 404 or no profile, redirect to onboarding
      if (error.response?.status === 404 || error.response?.status === 403) {
        navigate('/patient/onboarding');
      }
    }
  };

  const fetchPersonalizedData = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Not authenticated');
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Get current profile - ensure we have the latest profile data
      let currentProfile = profile;
      if (!currentProfile || !currentProfile.conditions || !Array.isArray(currentProfile.conditions) || currentProfile.conditions.length === 0) {
        try {
          const profileRes = await axios.get(`${API_URL}/patients/profile`, { headers });
          currentProfile = profileRes.data || {};
          if (currentProfile && Object.keys(currentProfile).length > 0) {
            setProfile(currentProfile);
          }
        } catch (error) {
          console.error('Could not fetch profile:', error);
          setClinicalTrials([]);
          setPublications([]);
          setExperts([]);
          setLoadingData(false);
          return;
        }
      }

      // Check if patient has conditions
      if (!currentProfile || !currentProfile.conditions || !Array.isArray(currentProfile.conditions) || currentProfile.conditions.length === 0) {
        console.log('No conditions found in profile. Showing empty results.');
        setClinicalTrials([]);
        setPublications([]);
        setExperts([]);
        setLoadingData(false);
        return;
      }
      
      // Fetch ONLY personalized data based on patient's conditions - NO FALLBACK
      const fetchTrials = async () => {
        try {
          const personalized = await axios.get(`${API_URL}/clinical-trials/personalized`, { headers });
          console.log('Personalized clinical trials:', personalized.data?.length || 0, 'for conditions:', currentProfile.conditions);
          return personalized.data || [];
        } catch (error) {
          console.error('Error fetching personalized trials:', error.response?.data || error.message);
          return [];
        }
      };

      const fetchPublications = async () => {
        try {
          const personalized = await axios.get(`${API_URL}/publications/personalized`, { headers });
          console.log('Personalized publications:', personalized.data?.length || 0, 'for conditions:', currentProfile.conditions);
          return personalized.data || [];
        } catch (error) {
          console.error('Error fetching personalized publications:', error.response?.data || error.message);
          return [];
        }
      };

      const fetchExperts = async () => {
        try {
          const personalized = await axios.get(`${API_URL}/experts/personalized`, { headers });
          console.log('Personalized experts:', personalized.data?.length || 0, 'for conditions:', currentProfile.conditions);
          return personalized.data || [];
        } catch (error) {
          console.error('Error fetching personalized experts:', error.response?.data || error.message);
          return [];
        }
      };

      const [trialsData, publicationsData, expertsData] = await Promise.all([
        fetchTrials(),
        fetchPublications(),
        fetchExperts(),
      ]);

      console.log('Setting filtered dashboard data:', { 
        trials: trialsData?.length || 0, 
        publications: publicationsData?.length || 0, 
        experts: expertsData?.length || 0,
        patientConditions: currentProfile?.conditions || []
      });

      setClinicalTrials(trialsData || []);
      setPublications(publicationsData || []);
      setExperts(expertsData || []);
    } catch (error) {
      console.error('Error fetching personalized data:', error);
      toast.error('Failed to load dashboard data');
      setClinicalTrials([]);
      setPublications([]);
      setExperts([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.nav-user')) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <span className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <div className="nav-brand">CuraLink</div>
        </div>
        <div className="nav-user">
          <div className="profile-dropdown-container">
            <button 
              className="profile-icon-button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-label="Profile menu"
            >
              <div className="profile-icon">
                <img 
                  src="data:image/jpeg;base64,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" 
                  alt="Profile" 
                  className="profile-image"
                />
              </div>
            </button>
            
            {profileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-icon">
                    <img 
                      src="data:image/jpeg;base64,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" 
                      alt="Profile" 
                      className="profile-dropdown-image"
                    />
                  </div>
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-name">{profile?.name || 'User'}</div>
                    <div className="profile-dropdown-type">Patient/Caregiver</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="dashboard-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="sidebar-icon">📊</span>
              <span className="sidebar-label">Dashboard</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'experts' ? 'active' : ''}`}
              onClick={() => setActiveTab('experts')}
            >
              <span className="sidebar-icon">👨‍⚕️</span>
              <span className="sidebar-label">Health Experts</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'trials' ? 'active' : ''}`}
              onClick={() => setActiveTab('trials')}
            >
              <span className="sidebar-icon">🔬</span>
              <span className="sidebar-label">Clinical Trials</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'publications' ? 'active' : ''}`}
              onClick={() => setActiveTab('publications')}
            >
              <span className="sidebar-icon">📄</span>
              <span className="sidebar-label">Publications</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'forums' ? 'active' : ''}`}
              onClick={() => setActiveTab('forums')}
            >
              <span className="sidebar-icon">💬</span>
              <span className="sidebar-label">Forums</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <span className="sidebar-icon">⭐</span>
              <span className="sidebar-label">Favorites</span>
            </button>
            
            <div className="sidebar-divider"></div>
            
            <button
              className="sidebar-item"
              onClick={() => {
                setProfileModalOpen(true);
              }}
            >
              <span className="sidebar-icon">👤</span>
              <span className="sidebar-label">My Profile</span>
            </button>
            <button
              className="sidebar-item"
              onClick={() => {
                setAccountTypeModalOpen(true);
              }}
            >
              <span className="sidebar-icon">🔄</span>
              <span className="sidebar-label">Change Account Type</span>
            </button>
            
            <div className="sidebar-divider"></div>
            
            <button
              className="sidebar-item logout-item"
              onClick={handleLogout}
            >
              <span className="sidebar-icon">🚪</span>
              <span className="sidebar-label">Logout</span>
            </button>
          </nav>
        </aside>

        <div className={`dashboard-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {activeTab === 'dashboard' && (
          <div className="dashboard-main">
            {/* Banner Section */}
            <div className="dashboard-banner-wrapper">
              <div className="dashboard-banner">
              <div className="banner-welcome-badge">
                <span className="banner-welcome-dot"></span>
                Welcome back, {profile?.name?.split(' ')[0] || 'Patient'}!
              </div>
              <h1 className="banner-heading">Your Research Hub</h1>
              <h2 className="banner-accent">Awaits</h2>
              <p className="banner-description">
                Connect with leading researchers, discover clinical trials, and access simplified medical publications—all in one platform.
              </p>
            </div>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card stat-card-purple">
                <div className="stat-number">{stats.experts}</div>
                <div className="stat-label">Expert Researchers</div>
              </div>
              <div className="stat-card stat-card-green">
                <div className="stat-number">{stats.clinicalTrials}</div>
                <div className="stat-label">Clinical Trials</div>
              </div>
              <div className="stat-card stat-card-blue">
                <div className="stat-number">{stats.publications}</div>
                <div className="stat-label">Publications</div>
              </div>
              <div className="stat-card stat-card-red">
                <div className="stat-number">{stats.discussions}</div>
                <div className="stat-label">Discussions</div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="how-it-works-section">
              <h2 className="section-title">How It Works</h2>
              <p className="section-subtitle">Get started in minutes and join a community advancing health research.</p>
              <div className="how-it-works-content">
                <div className="how-it-works-card">
                  <div className="how-it-works-icon purple-bg">
                    <span className="icon-emoji">❤️</span>
                  </div>
                  <div className="how-it-works-header">
                    <h3>For Patients & Caregivers</h3>
                  </div>
                  <div className="how-it-works-steps">
                    <div className="step">
                      <div className="step-number purple-bg">1</div>
                      <div className="step-content">
                        <div className="step-title">Create your profile</div>
                        <div className="step-description">Share your health interests and conditions</div>
                      </div>
                    </div>
                    <div className="step">
                      <div className="step-number purple-bg">2</div>
                      <div className="step-content">
                        <div className="step-title">Get personalized content</div>
                        <div className="step-description">Receive relevant trials, publications, and expert recommendations</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="how-it-works-card">
                  <div className="how-it-works-icon teal-bg">
                    <span className="icon-emoji">🔬</span>
                  </div>
                  <div className="how-it-works-header">
                    <h3>For Researchers</h3>
                  </div>
                  <div className="how-it-works-steps">
                    <div className="step">
                      <div className="step-number teal-bg">1</div>
                      <div className="step-content">
                        <div className="step-title">Set up your profile</div>
                        <div className="step-description">Add specialties, research interests, and credentials</div>
                      </div>
                    </div>
                    <div className="step">
                      <div className="step-number teal-bg">2</div>
                      <div className="step-content">
                        <div className="step-title">Find collaborators</div>
                        <div className="step-description">Connect with fellow researchers and potential study participants</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Sections */}
            <div className="recommended-sections">
              {/* Recommended Clinical Trials */}
              <div className="recommended-section">
                <div className="recommended-section-header">
                  <h2 className="recommended-section-title">
                    Recommended Clinical Trials
                  </h2>
                  <span 
                    className="see-more-text"
                    onClick={() => navigate('/patient/recommended/trials')}
                  >
                    See More →
                  </span>
                </div>
                {loadingData ? (
                  <p className="loading-text">Loading trials...</p>
                ) : clinicalTrials.length > 0 ? (
                  <div className="recommended-scroll-container">
                    <div className="recommended-scroll-content">
                      {clinicalTrials.slice(0, 2).map((trial) => (
                        <div key={trial.id} className="recommended-card modern-card trial-card">
                          <div className="card-favorite-icon" onClick={() => handleToggleFavorite('clinical_trial', trial.id)}>
                            <span className={`star-icon ${favorites[`clinical_trial_${trial.id}`] ? 'star-filled' : ''}`}>
                              {favorites[`clinical_trial_${trial.id}`] ? '★' : '☆'}
                            </span>
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
                            <span className="action-link" onClick={() => {
                              const subject = encodeURIComponent(`Inquiry about: ${trial.title}`);
                              const body = encodeURIComponent(
                                `Hello,\n\nI am interested in learning more about this clinical trial:\n\n${trial.title}\n\nThank you.`
                              );
                              window.location.href = `mailto:?subject=${subject}&body=${body}`;
                            }}>
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
                </div>
                ) : (
                  <p className="empty-state">Complete your profile to get clinical trial recommendations.</p>
                )}
              </div>

              {/* Recommended Publications */}
              <div className="recommended-section">
                <div className="recommended-section-header">
                  <h2 className="recommended-section-title">
                    Recommended Publications
                  </h2>
                  <span 
                    className="see-more-text"
                    onClick={() => navigate('/patient/recommended/publications')}
                  >
                    See More →
                  </span>
                </div>
                {loadingData ? (
                  <p className="loading-text">Loading publications...</p>
                ) : publications.length > 0 ? (
                  <div className="recommended-scroll-container">
                    <div className="recommended-scroll-content">
                      {publications.slice(0, 2).map((pub) => (
                        <div key={pub.id} className="recommended-card modern-card publication-card">
                          <div className="card-favorite-icon" onClick={() => handleToggleFavorite('publication', pub.id)}>
                            <span className={`star-icon ${favorites[`publication_${pub.id}`] ? 'star-filled' : ''}`}>
                              {favorites[`publication_${pub.id}`] ? '★' : '☆'}
                            </span>
                          </div>
                          <h3 className="card-title">{pub.title}</h3>
                          {pub.journal && pub.publication_date && (
                            <p className="card-source">
                              {pub.journal} • {new Date(pub.publication_date).getFullYear()}
                            </p>
                          )}
                          {pub.authors && pub.authors.length > 0 && (
                            <p className="card-authors">
                              By {pub.authors.slice(0, 2).map(author => author.includes('Dr.') ? author : `Dr. ${author}`).join(', ')}
                              {pub.authors.length > 2 && ' et al.'}
                            </p>
                          )}
                          <div className="card-actions-row">
                            <span className="action-link">
                              {pub.full_text_url ? (
                                <a
                                  href={pub.full_text_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Full Paper
                                </a>
                              ) : (
                                <span style={{ color: '#9ca3af', cursor: 'not-allowed' }}>View Full Paper</span>
                              )}
                            </span>
                            <span className="action-link" onClick={() => {
                              if (pub.ai_summary) {
                                alert(`AI Summary:\n\n${pub.ai_summary}`);
                              } else {
                                alert('AI summary not available for this publication');
                              }
                            }}>
                              Get AI Summary
                            </span>
                          </div>
                        </div>
                  ))}
                </div>
                  </div>
                ) : (
                  <p className="empty-state">Complete your profile to get publication recommendations.</p>
                )}
              </div>

              {/* Recommended Health Experts */}
              <div className="recommended-section">
                <div className="recommended-section-header">
                  <h2 className="recommended-section-title">
                    Recommended Health Experts
                  </h2>
                  <span 
                    className="see-more-text"
                    onClick={() => navigate('/patient/recommended/experts')}
                  >
                    See More →
                  </span>
                </div>
                {loadingData ? (
                  <p className="loading-text">Loading experts...</p>
                ) : experts && experts.length > 0 ? (
                  <div className="recommended-scroll-container">
                    <div className="recommended-scroll-content">
                      {experts.slice(0, 2).map((expert) => (
                        <div key={expert.id} className="recommended-card modern-card expert-card">
                          <div className="card-favorite-icon" onClick={() => handleToggleFavorite('expert', expert.id)}>
                            <span className={`star-icon ${favorites[`expert_${expert.id}`] ? 'star-filled' : ''}`}>
                              {favorites[`expert_${expert.id}`] ? '★' : '☆'}
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
                                {expert.research_interests.slice(0, 2).map((interest, idx) => (
                                  <span key={idx} className="interest-tag">{interest}</span>
                                ))}
                              </div>
                            </>
                          )}
                          <div className="card-actions-buttons">
                            <button
                              onClick={() => handleFollowExpert(expert.id)}
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
                  </div>
                ) : (
                  <p className="empty-state">Complete your profile to get expert recommendations.</p>
                )}
              </div>
            </div>

            {/* Everything You Need Section */}
            <div className="everything-section">
              <h2 className="section-title">Everything You Need</h2>
              <p className="section-subtitle">Powerful tools to navigate the world of medical research</p>
              <div className="feature-cards-grid">
                <div className="feature-card">
                  <div className="feature-icon purple-bg">
                    <span className="icon-emoji">👥</span>
                  </div>
                  <h3 className="feature-title">Find Experts</h3>
                  <p className="feature-description">Connect with leading researchers and specialists in your field of interest</p>
                  <button className="feature-link" onClick={() => setActiveTab('experts')}>
                    Explore →
                  </button>
                </div>
                <div className="feature-card">
                  <div className="feature-icon teal-bg">
                    <span className="icon-emoji">🔬</span>
                  </div>
                  <h3 className="feature-title">Clinical Trials</h3>
                  <p className="feature-description">Discover ongoing clinical trials and research opportunities</p>
                  <button className="feature-link" onClick={() => setActiveTab('trials')}>
                    Explore →
                  </button>
                </div>
              </div>
            </div>

            {/* Publications and Forums Cards */}
            <div className="additional-features-grid">
              <div className="feature-card">
                <div className="feature-icon red-bg">
                  <span className="icon-emoji">📄</span>
                </div>
                <h3 className="feature-title">Research Publications</h3>
                <p className="feature-description">Access simplified summaries of the latest medical research</p>
                <button className="feature-link" onClick={() => setActiveTab('publications')}>
                  Explore →
                </button>
              </div>
              <div className="feature-card">
                <div className="feature-icon purple-bg">
                  <span className="icon-emoji">💬</span>
                </div>
                <h3 className="feature-title">Forums</h3>
                <p className="feature-description">Join conversations between Patient/Caregivers and researchers</p>
                <button className="feature-link" onClick={() => setActiveTab('forums')}>
                  Explore →
                </button>
              </div>
            </div>

            {/* Recent Discussions Section */}
            <div className="recent-discussions-section">
              <div className="section-header">
                <div className="section-icon purple-bg">
                  <span className="icon-emoji">📊</span>
                </div>
                <h2 className="section-title">Recent Discussions</h2>
                <button className="view-all-link" onClick={() => setActiveTab('forums')}>
                  View All →
                </button>
              </div>
              <div className="discussions-list">
                {recentPosts.length > 0 ? (
                  recentPosts.map((post) => (
                    <div key={post.id} className="discussion-item" onClick={() => {
                      setActiveTab('forums');
                      // You might want to navigate to the specific post here
                    }}>
                      <div className="discussion-tags">
                        <span className="discussion-tag">{post.category_name}</span>
                          </div>
                      <div className="discussion-meta">
                        <span>by {post.author_name || 'User'}</span>
                        <span>·</span>
                        <span>{post.reply_count || 0} replies</span>
                      </div>
                      <h3 className="discussion-title">{post.title}</h3>
                      <p className="discussion-preview">{post.content?.substring(0, 200)}...</p>
                    </div>
                  ))
                    ) : (
                  <p className="empty-state">No recent discussions available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'experts' && <HealthExperts />}
        {activeTab === 'trials' && <ClinicalTrials />}
        {activeTab === 'publications' && <Publications />}
        {activeTab === 'forums' && <Forums />}
        {activeTab === 'favorites' && <Favorites />}
        </div>
      </div>

      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)}
        userType="patient"
        onProfileUpdate={(updatedProfile) => {
          setProfile(updatedProfile);
          if (activeTab === 'dashboard') {
            fetchDashboardData();
          }
        }}
      />
      <AccountTypeModal 
        isOpen={accountTypeModalOpen} 
        onClose={() => setAccountTypeModalOpen(false)}
        currentUserType="patient"
      />
    </div>
  );
};

export default PatientDashboard;

