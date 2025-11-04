import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import '../Dashboard.css';
import Collaborators from './Collaborators';
import ClinicalTrialsManage from './ClinicalTrialsManage';
import PublicationsManage from './PublicationsManage';
import Forums from './Forums';
import MeetingRequests from './MeetingRequests';
import Favorites from './Favorites';
import ProfileModal from '../../components/ProfileModal';
import AccountTypeModal from '../../components/AccountTypeModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResearcherDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [accountTypeModalOpen, setAccountTypeModalOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [clinicalTrials, setClinicalTrials] = useState([]);
  const [connections, setConnections] = useState([]);
  const [potentialCollaborators, setPotentialCollaborators] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [expandedAISummaries, setExpandedAISummaries] = useState({});
  const [favorites, setFavorites] = useState({});
  const [connectionPending, setConnectionPending] = useState({});
  const [selectedCollaboratorProfile, setSelectedCollaboratorProfile] = useState(null);
  const [showConnectionConfirm, setShowConnectionConfirm] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'send'|'cancel'|'accept', collaboratorId, connection }
  const { user, logout } = useAuth();
  const [meetingActive, setMeetingActive] = useState(() => {
    try {
      const stored = localStorage.getItem('researcherMeetingActive');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('researcherMeetingActive', JSON.stringify(meetingActive));
    } catch {}
    // Sync availability to backend
    (async () => {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/researchers/availability`, { availabilityForMeetings: !!meetingActive }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (_) {}
    })();
  }, [meetingActive]);


  useEffect(() => {
    if (activeTab === 'dashboard' && user?.id) {
      fetchDashboardData();
      // Refresh connections periodically to check for accepted status
      const interval = setInterval(() => {
        fetchConnectionsOnly();
      }, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, user?.id]);

  const fetchConnectionsOnly = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      const connectionsRes = await axios.get(`${API_URL}/collaborators/connections`, { headers });
      setConnections(connectionsRes.data);
      
      // Update connection pending status - get user ID from auth endpoint if not available
      let currentUserId = user?.id;
      if (!currentUserId) {
        try {
          const authRes = await axios.get(`${API_URL}/auth/me`, { headers });
          currentUserId = authRes.data?.id;
        } catch (error) {
          console.error('Error fetching user ID:', error);
        }
      }
      
      const pendingMap = {};
      if (currentUserId) {
        connectionsRes.data.forEach(conn => {
          if (conn.status === 'pending') {
            // Determine which side is the collaborator - ensure we compare numbers
            const requesterId = parseInt(conn.requester_id);
            const receiverId = parseInt(conn.receiver_id);
            const userId = parseInt(currentUserId);
            const collaboratorId = requesterId === userId ? receiverId : requesterId;
            pendingMap[collaboratorId] = true;
          }
        });
      }
      setConnectionPending(pendingMap);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/researchers/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Object.keys(response.data).length > 0) {
        setProfile(response.data);
        // Initialize meeting availability from backend profile
        if (typeof response.data.availability_for_meetings === 'boolean') {
          setMeetingActive(response.data.availability_for_meetings);
        }
      } else {
        // Profile doesn't exist, redirect to onboarding
        navigate('/researcher/onboarding');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If 404 or no profile, redirect to onboarding
      if (error.response?.status === 404 || error.response?.status === 403) {
        navigate('/researcher/onboarding');
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const [trialsRes, connectionsRes, collaboratorsRes, postsRes, favoritesRes] = await Promise.all([
        axios.get(`${API_URL}/clinical-trials/my-trials`, { headers }),
        axios.get(`${API_URL}/collaborators/connections`, { headers }),
        axios.get(`${API_URL}/collaborators/search`, { headers, params: { limit: 6 } }),
        axios.get(`${API_URL}/forums/recent-posts?limit=2`, { headers }),
        axios.get(`${API_URL}/favorites`, { headers })
      ]);

      setClinicalTrials(trialsRes.data);
      setConnections(connectionsRes.data);
      setPotentialCollaborators(collaboratorsRes.data);
      setRecentPosts(postsRes.data);
      
      // Build favorites map
      const favoritesMap = {};
      favoritesRes.data.forEach(fav => {
        const key = `${fav.item_type}_${fav.item_id}`;
        favoritesMap[key] = true;
      });
      setFavorites(favoritesMap);

      // Initialize connection pending status
      const currentUserId = user?.id;
      const pendingMap = {};
      if (currentUserId) {
        connectionsRes.data.forEach(conn => {
          if (conn.status === 'pending') {
            // Determine which side is the collaborator
            const collaboratorId = conn.requester_id === currentUserId ? conn.receiver_id : conn.requester_id;
            pendingMap[collaboratorId] = true;
          }
        });
      }
      setConnectionPending(pendingMap);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
        await axios.delete(`${API_URL}/favorites/${itemType}/${itemId}`, { headers });
        setFavorites(prev => {
          const newFavs = { ...prev };
          delete newFavs[key];
          return newFavs;
        });
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API_URL}/favorites`, {
          itemType,
          itemId,
        }, { headers });
        setFavorites(prev => ({ ...prev, [key]: true }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const toggleAISummary = (trialId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [trialId]: !prev[trialId]
    }));
  };

  const handleChatClickDash = (collab) => {
    const status = getConnectionStatus(collab.user_id);
    if (status === 'accepted') {
      toast.info('Opening chat in Collaborators');
      setActiveTab('collaborators');
    } else {
      toast.info('Connect first');
    }
  };

  const handleConnect = async (collaboratorId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/collaborators/${collaboratorId}/connect`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setConnectionPending(prev => ({ ...prev, [collaboratorId]: true }));
      setShowConnectionConfirm(null);
      toast.success('Connection request sent');
      // Refresh connections immediately to get the latest status
      await fetchConnectionsOnly();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send connection request');
      setShowConnectionConfirm(null);
    }
  };

  const handleConnectClick = (collaboratorId) => {
    const status = getConnectionStatus(collaboratorId);
    if (status === null) {
      setConfirmAction({ type: 'send', collaboratorId });
    } else if (status === 'outgoing_pending') {
      const connection = findConnection(collaboratorId);
      if (connection) setConfirmAction({ type: 'cancel', collaboratorId, connection });
    } else if (status === 'incoming_pending') {
      const connection = findConnection(collaboratorId);
      if (connection) setConfirmAction({ type: 'accept', collaboratorId, connection });
    }
  };

  const findConnection = (collaboratorId) => {
    const userId = parseInt(user?.id);
    const collabId = parseInt(collaboratorId);
    return connections.find(conn => {
      const requesterId = parseInt(conn.requester_id);
      const receiverId = parseInt(conn.receiver_id);
      const match = (requesterId === userId && receiverId === collabId) || (receiverId === userId && requesterId === collabId);
      return match && conn.status !== 'rejected';
    });
  };

  const getConnectionStatus = (collaboratorId) => {
    const conn = findConnection(collaboratorId);
    if (!conn) return null;
    const isReceiver = parseInt(conn.receiver_id) === parseInt(user?.id);
    if (conn.status === 'pending') {
      return isReceiver ? 'incoming_pending' : 'outgoing_pending';
    }
    return conn.status;
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
    <div className="dashboard-container researcher">
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
          <span className="role-chip">Researcher</span>
          <div className="profile-dropdown-container">
            <button 
              className="profile-icon-button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-label="Profile menu"
            >
              <div className="profile-icon">
                <img 
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyHK1jFQSzBikt4Dl5bg5bbxmYCGc10iGRMA&s" 
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
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyHK1jFQSzBikt4Dl5bg5bbxmYCGc10iGRMA&amp;s" 
                      alt="Profile" 
                      className="profile-dropdown-image"
                    />
                  </div>
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-name">{profile?.name || 'User'}</div>
                    <div className="profile-dropdown-type">Researcher</div>
                  </div>
                </div>
                <div className="profile-dropdown-divider"></div>
                <div className="profile-dropdown-item meeting-toggle-row" role="button" aria-label="Meeting notification toggle" onClick={() => setMeetingActive(!meetingActive)}>
                  <span className="dropdown-icon">🟢</span>
                  <span style={{ flex: 1 }}>Meeting Notification</span>
                  <span className={`meeting-toggle ${meetingActive ? 'active' : ''}`} aria-pressed={meetingActive} aria-label={meetingActive ? 'Meeting active' : 'Meeting inactive'}>
                    <span className="meeting-toggle-knob"></span>
                  </span>
                </div>
                <button 
                  className="profile-dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setActiveTab('meetingRequests');
                  }}
                >
                  <span className="dropdown-icon">📆</span>
                  <span>Show Meeting Requests</span>
                </button>
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
              className={`sidebar-item ${activeTab === 'collaborators' ? 'active' : ''}`}
              onClick={() => setActiveTab('collaborators')}
            >
              <span className="sidebar-icon">👥</span>
              <span className="sidebar-label">Collaborators</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'trials' ? 'active' : ''}`}
              onClick={() => setActiveTab('trials')}
            >
              <span className="sidebar-icon">🔬</span>
              <span className="sidebar-label">Manage Clinical Trials</span>
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
              onClick={() => setProfileModalOpen(true)}
            >
              <span className="sidebar-icon">👤</span>
              <span className="sidebar-label">My Profile</span>
            </button>
            <button
              className="sidebar-item"
              onClick={() => setAccountTypeModalOpen(true)}
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
                  Welcome back, {profile?.name?.split(' ')[0] || 'Researcher'}!
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
                <div className="stat-number">{potentialCollaborators.length}</div>
                <div className="stat-label">Potential Collaborators</div>
              </div>
              <div className="stat-card stat-card-green">
                <div className="stat-number">{clinicalTrials.length}</div>
                <div className="stat-label">Clinical Trials</div>
              </div>
              <div className="stat-card stat-card-blue">
                <div className="stat-number">{recentPosts.length}</div>
                <div className="stat-label">Recent Discussions</div>
              </div>
              <div className="stat-card stat-card-red">
                <div className="stat-number">{Object.keys(favorites).length}</div>
                <div className="stat-label">Favorites</div>
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

            <div className="dashboard-sections">
              {/* Clinical Trials Section */}
              <section className="dashboard-section">
                <div className="recommended-section-header" style={{ marginBottom: '20px' }}>
                  <h2 className="recommended-section-title">Clinical Trials</h2>
                  <span 
                    className="see-more-text"
                    onClick={() => setActiveTab('trials')}
                    style={{ cursor: 'pointer' }}
                  >
                    See more →
                  </span>
                </div>
                <div className="cards-grid">
                  {clinicalTrials.slice(0, 2).map((trial) => (
                    <div key={trial.id} className="card modern-card trial-card">
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
                        <span className="action-link" onClick={() => setActiveTab('trials')}>
                          View Details
                        </span>
                        <span className="action-link" onClick={() => toggleAISummary(trial.id)}>
                          {expandedAISummaries[trial.id] ? 'Hide AI Summary' : 'Get AI Summary'}
                        </span>
                      </div>
                      {expandedAISummaries[trial.id] && trial.ai_summary && (
                        <div className="ai-summary-container">
                          <div className="ai-summary-content">
                            {trial.ai_summary}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {clinicalTrials.length === 0 && (
                  <p className="empty-state">No clinical trials yet. Create your first trial!</p>
                )}
              </section>

              {/* Potential Collaborators Section */}
              <section className="dashboard-section">
                <div className="recommended-section-header" style={{ marginBottom: '20px' }}>
                  <h2 className="recommended-section-title">Potential Collaborators</h2>
                  <span 
                    className="see-more-text"
                    onClick={() => setActiveTab('collaborators')}
                    style={{ cursor: 'pointer' }}
                  >
                    See more →
                  </span>
                </div>
                <div className="cards-grid">
                  {potentialCollaborators.slice(0, 2).map((collaborator) => {
                    const connectionStatus = getConnectionStatus(collaborator.user_id);
                    const isPending = connectionStatus === 'pending' || connectionPending[collaborator.user_id];
                    const universities = [
                      'Stanford University',
                      'Harvard University',
                      'MIT',
                      'University of Oxford',
                      'University of Cambridge',
                      'Johns Hopkins University',
                      'UC Berkeley',
                      'UCLA',
                      'Imperial College London',
                      'Karolinska Institute'
                    ];
                    const getUniversityForId = (id) => {
                      const n = parseInt(id, 10);
                      if (Number.isNaN(n)) return universities[0];
                      return universities[Math.abs(n) % universities.length];
                    };
                    const university = getUniversityForId(collaborator.user_id);
                    return (
                      <div key={collaborator.user_id} className="collab-card">
                        <div className="collab-card-main">
                          <div className="collab-card-content">
                            <h3 className="collab-card-title">{collaborator.name}</h3>
                            <div className="collab-card-subtitle">
                              {(collaborator.specialties && collaborator.specialties.length > 0)
                                ? `${collaborator.specialties[0]} • ${university}`
                                : `Researcher • ${university}`}
                            </div>
                            {(collaborator.research_interests && collaborator.research_interests.length > 0) && (
                              <div className="collab-card-tags">
                                {collaborator.research_interests.slice(0, 2).map((interest, idx) => (
                                  <span key={idx} className="collab-chip">{interest}</span>
                                ))}
                              </div>
                            )}
                            {(() => {
                              const pubs = collaborator.publications
                                ? (Array.isArray(collaborator.publications)
                                  ? collaborator.publications
                                  : JSON.parse(collaborator.publications || '[]'))
                                : [];
                              const count = pubs.length;
                              return (
                                <div
                                  className="collab-card-meta clickable"
                                  onClick={() => setSelectedCollaboratorProfile(collaborator)}
                                >
                                  {count} recent publications
                                </div>
                              );
                            })()}
                          </div>
                          <button
                            className={`collab-fav ${favorites[`collaborator_${collaborator.user_id}`] ? 'active' : ''}`}
                            onClick={() => handleToggleFavorite('collaborator', collaborator.user_id)}
                            aria-label="Toggle favorite"
                          >
                            {favorites[`collaborator_${collaborator.user_id}`] ? '★' : '☆'}
                          </button>
                        </div>
                        <div className="collab-card-actions">
                          {connectionStatus === 'accepted' ? (
                            <button className="collab-button-primary" disabled>Connected</button>
                          ) : connectionStatus === 'incoming_pending' ? (
                            <button className="collab-button-primary" onClick={() => handleConnectClick(collaborator.user_id)}>Accept Request</button>
                          ) : connectionStatus === 'outgoing_pending' ? (
                            <button className="collab-button-primary" onClick={() => handleConnectClick(collaborator.user_id)}>Pending Request</button>
                          ) : (
                            <button className="collab-button-primary" onClick={() => handleConnectClick(collaborator.user_id)}>Connect</button>
                          )}
                          <button className="collab-button-outline" onClick={() => setSelectedCollaboratorProfile(collaborator)}>View Profile</button>
                          <button className="collab-button-outline" type="button" onClick={() => handleChatClickDash(collaborator)}>Chat</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {potentialCollaborators.length === 0 && (
                  <p className="empty-state">No potential collaborators found.</p>
                )}
              </section>

              {/* Forum Section */}
              <section className="dashboard-section">
                <div className="recent-discussions-section">
                  <div className="section-header">
                    <div className="section-icon purple-bg">
                      <span className="icon-emoji">💬</span>
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
              </section>
            </div>
          </div>
        )}

        {activeTab === 'collaborators' && <Collaborators />}
        {activeTab === 'trials' && <ClinicalTrialsManage />}
        {activeTab === 'publications' && <PublicationsManage />}
        {activeTab === 'forums' && <Forums />}
        {activeTab === 'meetingRequests' && <MeetingRequests researcherName={profile?.name || 'Researcher'} />}
        {activeTab === 'favorites' && <Favorites />}
        </div>
      </div>

      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)}
        userType="researcher"
        onProfileUpdate={(updatedProfile) => {
          setProfile(updatedProfile);
        }}
      />
      <AccountTypeModal 
        isOpen={accountTypeModalOpen} 
        onClose={() => setAccountTypeModalOpen(false)}
        currentUserType="researcher"
      />

      {/* Connection Action Modal */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{confirmAction.type === 'send' ? 'Send Connection Request' : confirmAction.type === 'cancel' ? 'Cancel Pending Request' : 'Accept Connection Request'}</h2>
              <button className="modal-close" onClick={() => setConfirmAction(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                {confirmAction.type === 'send' && 'Are you sure you want to send a connection request to this researcher?'}
                {confirmAction.type === 'cancel' && 'Do you want to cancel your pending request?'}
                {confirmAction.type === 'accept' && 'Do you want to accept this connection request?'}
              </p>
              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button onClick={() => setConfirmAction(null)} className="secondary-button">Cancel</button>
                {confirmAction.type === 'send' && (
                  <button
                    onClick={async () => { await handleConnect(confirmAction.collaboratorId); setConfirmAction(null); }}
                    className="primary-button"
                    style={{ background: '#34A853' }}
                  >
                    Send Request
                  </button>
                )}
                {confirmAction.type === 'cancel' && (
                  <button
                    onClick={async () => { 
                      const token = localStorage.getItem('token');
                      await axios.put(`${API_URL}/collaborators/connections/${confirmAction.connection.id}`, { status: 'rejected' }, { headers: { 'Authorization': `Bearer ${token}` } });
                      await fetchConnectionsOnly();
                      setConfirmAction(null);
                    }}
                    className="primary-button"
                  >
                    Cancel Request
                  </button>
                )}
                {confirmAction.type === 'accept' && (
                  <button
                    onClick={async () => { 
                      const token = localStorage.getItem('token');
                      await axios.put(`${API_URL}/collaborators/connections/${confirmAction.connection.id}`, { status: 'accepted' }, { headers: { 'Authorization': `Bearer ${token}` } });
                      await fetchConnectionsOnly();
                      setConfirmAction(null);
                    }}
                    className="primary-button"
                    style={{ background: '#34A853' }}
                  >
                    Accept
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaborator Profile Modal */}
      {selectedCollaboratorProfile && (
        <div className="modal-overlay" onClick={() => setSelectedCollaboratorProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCollaboratorProfile.name}</h2>
              <button className="modal-close" onClick={() => setSelectedCollaboratorProfile(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '10px' }}>
                {(selectedCollaboratorProfile.specialties && selectedCollaboratorProfile.specialties.length > 0)
                  ? selectedCollaboratorProfile.specialties.join(', ')
                  : 'Researcher'}
              </p>
              {(() => {
                const universities = [
                  'Stanford University','Harvard University','MIT','University of Oxford','University of Cambridge','Johns Hopkins University','UC Berkeley','UCLA','Imperial College London','Karolinska Institute'
                ];
                const getUniversityForId = (id) => {
                  const n = parseInt(id, 10);
                  if (Number.isNaN(n)) return universities[0];
                  return universities[Math.abs(n) % universities.length];
                };
                return (
                  <p style={{ color: '#6b7280', marginTop: 0 }}>{getUniversityForId(selectedCollaboratorProfile.user_id)}</p>
                );
              })()}
              {selectedCollaboratorProfile.research_interests && selectedCollaboratorProfile.research_interests.length > 0 && (
                <div style={{ margin: '12px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedCollaboratorProfile.research_interests.slice(0, 5).map((i, idx) => (
                    <span key={idx} className="collab-chip">{i}</span>
                  ))}
                </div>
              )}
              {(() => {
                const pubs = selectedCollaboratorProfile.publications
                  ? (Array.isArray(selectedCollaboratorProfile.publications)
                    ? selectedCollaboratorProfile.publications
                    : JSON.parse(selectedCollaboratorProfile.publications || '[]'))
                  : [];
                if (pubs.length === 0) return <p className="empty-state">No publications available.</p>;
                return (
                  <div>
                    <h3>Recent Publications</h3>
                    <ul style={{ paddingLeft: '18px' }}>
                      {pubs.slice(0, 5).map((p, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{p.title || 'Untitled Publication'}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearcherDashboard;

