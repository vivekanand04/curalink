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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResearcherDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
          <span>Welcome, {profile?.name || user?.email}</span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
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
    </div>
  );
};

export default ResearcherDashboard;

