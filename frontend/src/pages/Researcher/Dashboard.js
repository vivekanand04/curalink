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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

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
      
      const [trialsRes, connectionsRes] = await Promise.all([
        axios.get(`${API_URL}/clinical-trials/my-trials`, { headers }),
        axios.get(`${API_URL}/collaborators/connections`, { headers }),
      ]);

      setClinicalTrials(trialsRes.data);
      setConnections(connectionsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
                    <div className="profile-dropdown-type">Researcher</div>
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
          </nav>
        </aside>

        <div className={`dashboard-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {activeTab === 'dashboard' && (
          <div className="dashboard-main">
            <h1>Welcome back, {profile?.name || 'Researcher'}!</h1>
            <p className="subtitle">Your research dashboard</p>

            <div className="dashboard-sections">
              <section className="dashboard-section">
                <h2>My Clinical Trials</h2>
                <div className="cards-grid">
                  {clinicalTrials.slice(0, 3).map((trial) => (
                    <div key={trial.id} className="card">
                      <h3>{trial.title}</h3>
                      <p className="card-meta">Condition: {trial.condition}</p>
                      <p className="card-meta">Phase: {trial.phase} | Status: {trial.status}</p>
                      <p className="card-description">{trial.description?.substring(0, 150)}...</p>
                      {trial.ai_summary && (
                        <div className="ai-summary">
                          <strong>AI Summary:</strong> {trial.ai_summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {clinicalTrials.length === 0 && (
                  <p className="empty-state">No clinical trials yet. Create your first trial!</p>
                )}
              </section>

              <section className="dashboard-section">
                <h2>Recent Connections</h2>
                <div className="cards-grid">
                  {connections.slice(0, 3).map((conn) => (
                    <div key={conn.id} className="card">
                      <h3>{conn.name}</h3>
                      <p className="card-meta">
                        Specialties: {conn.specialties?.join(', ')}
                      </p>
                      <p className="card-meta">
                        Status: <span style={{ 
                          color: conn.status === 'accepted' ? 'green' : 
                                 conn.status === 'pending' ? 'orange' : 'red' 
                        }}>
                          {conn.status}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
                {connections.length === 0 && (
                  <p className="empty-state">No connections yet. Start connecting with other researchers!</p>
                )}
              </section>

              <section className="dashboard-section">
                <h2>My Publications</h2>
                {(() => {
                  const profilePubs = profile?.publications ? (Array.isArray(profile.publications) ? profile.publications : JSON.parse(profile.publications || '[]')) : [];
                  return profilePubs.length > 0 ? (
                    <div className="cards-grid">
                      {profilePubs.slice(0, 3).map((pub, index) => (
                        <div key={index} className="card">
                          <h3>{pub.title || 'Publication'}</h3>
                          {pub.journal && <p className="card-meta">Journal: {pub.journal}</p>}
                          {pub.ai_summary && (
                            <div className="ai-summary">
                              <strong>AI Summary:</strong> {pub.ai_summary}
                            </div>
                          )}
                          {pub.url && (
                            <a href={pub.url} target="_blank" rel="noopener noreferrer" className="link-button">
                              View Publication
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No publications yet. Add publications manually or link your ORCID/ResearchGate to auto-import.</p>
                  );
                })()}
              </section>
            </div>
          </div>
        )}

        {activeTab === 'collaborators' && <Collaborators />}
        {activeTab === 'trials' && <ClinicalTrialsManage />}
        {activeTab === 'publications' && <PublicationsManage />}
        {activeTab === 'forums' && <Forums />}
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
    </div>
  );
};

export default ResearcherDashboard;

