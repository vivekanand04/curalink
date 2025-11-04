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
  const [expandedAISummaries, setExpandedAISummaries] = useState({}); // Track expanded AI summaries: { 'clinical_trial_1': true, 'publication_2': true }
  const [favorites, setFavorites] = useState({}); // Track favorites: { 'clinical_trial_1': true, 'expert_2': true, etc. }
  const [followedExperts, setFollowedExperts] = useState(new Set());
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
      const followedExpertIds = new Set();
      response.data.forEach(fav => {
        const key = `${fav.item_type}_${fav.item_id}`;
        favoritesMap[key] = true;
        if (fav.item_type === 'expert') {
          followedExpertIds.add(fav.item_id);
        }
      });
      setFavorites(favoritesMap);
      setFollowedExperts(followedExpertIds);
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
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      if (followedExperts.has(expertId)) {
        // Unfollow
        await axios.delete(`${API_URL}/favorites/expert/${expertId}`, { headers });
        setFollowedExperts(prev => {
          const newSet = new Set(prev);
          newSet.delete(expertId);
          return newSet;
        });
        setFavorites(prev => {
          const newFavs = { ...prev };
          delete newFavs[`expert_${expertId}`];
          return newFavs;
        });
        toast.success('Expert unfollowed');
      } else {
        // Follow
        await axios.post(`${API_URL}/experts/${expertId}/follow`, {}, { headers });
        setFollowedExperts(prev => new Set(prev).add(expertId));
        setFavorites(prev => ({ ...prev, [`expert_${expertId}`]: true }));
        toast.success('Expert followed successfully');
      }
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 409) {
        toast.info('Expert bookmarked');
        setFollowedExperts(prev => new Set(prev).add(expertId));
      } else {
        toast.error('Failed to follow expert');
      }
    }
  };

  const [showMeetingModal, setShowMeetingModal] = useState(null);
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
      // Find expert and determine availability from backend data
      const expert = experts.find(e => e.id === expertId);
      const isActive = !!expert?.availability_for_meetings;
      const expertName = expert?.name || 'Researcher';

      if (isActive) {
        toast.success(`Request sent to ${expertName} successfully.`);
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
      setShowMeetingModal(null);
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
    <div className="dashboard-container patient">
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
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqIiMNmmzFEOEuoFjC4b-qaBQpgYeV-FwY2w&s"
                  alt="Profile"
                  className="profile-image"
                />
                  </div>
               
            </button>
            
            {profileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-icon">
                    <div className="profile-dropdown-initial">{(profile?.name || 'U').charAt(0)}</div>
                  </div>
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-name">{profile?.name || 'User'}</div>
                    <div className="profile-dropdown-type">Patient/Caregiver</div>
                  </div>
                </div>
                <div className="profile-dropdown-divider"></div>
                <button 
                  className="profile-dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setProfileModalOpen(true);
                  }}
                >
                  <span className="dropdown-icon">👤</span>
                  <span>My Profile</span>
                </button>
                <button 
                  className="profile-dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setAccountTypeModalOpen(true);
                  }}
                >
                  <span className="dropdown-icon">🔄</span>
                  <span>Change Account Type</span>
                </button>
                <div className="profile-dropdown-divider"></div>
                <button 
                  className="profile-dropdown-item logout-item"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  <span className="dropdown-icon">🚪</span>
                  <span>Logout</span>
                </button>
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
                              setExpandedAISummaries(prev => ({
                                ...prev,
                                [`trial_${trial.id}`]: !prev[`trial_${trial.id}`]
                              }));
                            }}>
                              {expandedAISummaries[`trial_${trial.id}`] ? 'Hide AI Summary' : 'Get AI Summary'}
                            </span>
                          </div>
                          {expandedAISummaries[`trial_${trial.id}`] && trial.ai_summary && (
                            <div className="ai-summary-container">
                              <div className="ai-summary-content">
                                {trial.ai_summary}
                              </div>
                            </div>
                          )}
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
                              setExpandedAISummaries(prev => ({
                                ...prev,
                                [`pub_${pub.id}`]: !prev[`pub_${pub.id}`]
                              }));
                            }}>
                              {expandedAISummaries[`pub_${pub.id}`] ? 'Hide AI Summary' : 'Get AI Summary'}
                            </span>
                          </div>
                          {expandedAISummaries[`pub_${pub.id}`] && pub.ai_summary && (
                            <div className="ai-summary-container">
                              <div className="ai-summary-content">
                                {pub.ai_summary}
                              </div>
                            </div>
                          )}
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
                              className={`follow-button ${followedExperts.has(expert.id) ? 'following' : ''}`}
                            >
                              {followedExperts.has(expert.id) ? 'Following' : 'Follow'}
                            </button>
                            {expert.is_platform_member && (
                              <button
                                onClick={() => setShowMeetingModal(expert.id)}
                                className="request-meeting-button"
                              >
                                Request Meeting
                              </button>
                            )}
                          </div>
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
              <div className="discussions-list-reddit">
                {recentPosts.length > 0 ? (
                  recentPosts.slice(0, 2).map((post) => (
                    <div key={post.id} className="post-card-reddit">
                      <div className="post-voting-section">
                        <div className="vote-arrow-up">▲</div>
                        <div className="vote-count">{post.reply_count || 0}</div>
                        <div className="vote-arrow-down">▼</div>
                      </div>
                      <div className="post-content-section">
                        <div className="post-header-reddit">
                          <span className="post-category-badge-reddit">{post.category_name}</span>
                          <span className="post-author-reddit">by {post.author_name || 'User'}</span>
                          <span className="post-time-reddit">{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="post-title-reddit">{post.title}</h3>
                        <p className="post-body-reddit">{post.content}</p>
                        <div className="post-footer-reddit">
                          <span className="post-comment-link">{post.reply_count || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No recent discussions available</p>
                )}
                {recentPosts.length > 0 && (
                  <div className="view-all-discussions">
                    <span className="view-all-text" onClick={() => setActiveTab('forums')}>
                      View all
                    </span>
                  </div>
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
    </div>
  );
};

export default PatientDashboard;

