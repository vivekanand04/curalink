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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState(null);
  const [clinicalTrials, setClinicalTrials] = useState([]);
  const [publications, setPublications] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    if (activeTab === 'dashboard') {
      fetchPersonalizedData();
    }
  }, [activeTab]);

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
      
      // Fetch all data (will show personalized if available, otherwise all)
      const fetchTrials = async () => {
        try {
          const personalized = await axios.get(`${API_URL}/clinical-trials/personalized`, { headers });
          if (personalized.data && personalized.data.length > 0) {
            return personalized.data;
          }
        } catch (error) {
          console.log('Personalized trials not available, fetching all');
        }
        const all = await axios.get(`${API_URL}/clinical-trials`, { headers });
        return all.data || [];
      };

      const fetchPublications = async () => {
        try {
          const personalized = await axios.get(`${API_URL}/publications/personalized`, { headers });
          if (personalized.data && personalized.data.length > 0) {
            return personalized.data;
          }
        } catch (error) {
          console.log('Personalized publications not available, fetching all');
        }
        const all = await axios.get(`${API_URL}/publications`, { headers });
        return all.data || [];
      };

      const fetchExperts = async () => {
        try {
          const personalized = await axios.get(`${API_URL}/experts/personalized`, { headers });
          if (personalized.data && personalized.data.length > 0) {
            return personalized.data;
          }
        } catch (error) {
          console.log('Personalized experts not available, fetching all', error.response?.data || error.message);
        }
        try {
          const all = await axios.get(`${API_URL}/experts`, { headers });
          console.log('Fetched experts:', all.data);
          return all.data || [];
        } catch (error) {
          console.error('Error fetching all experts:', error.response?.data || error.message);
          return [];
        }
      };

      const [trialsData, publicationsData, expertsData] = await Promise.all([
        fetchTrials(),
        fetchPublications(),
        fetchExperts(),
      ]);

      console.log('Setting dashboard data:', { 
        trials: trialsData?.length || 0, 
        publications: publicationsData?.length || 0, 
        experts: expertsData?.length || 0 
      });

      setClinicalTrials(trialsData || []);
      setPublications(publicationsData || []);
      setExperts(expertsData || []);
    } catch (error) {
      console.error('Error fetching personalized data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoadingData(false);
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
          </nav>
        </aside>

        <div className={`dashboard-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {activeTab === 'dashboard' && (
          <div className="dashboard-main">
            <h1>Welcome back, {profile?.name || 'Patient'}!</h1>
            <p className="subtitle">Here are your personalized recommendations</p>

            <div className="dashboard-sections">
              <section className="dashboard-section">
                <h2>Recommended Clinical Trials</h2>
                <div className="cards-grid">
                  {clinicalTrials.slice(0, 3).map((trial) => (
                    <div key={trial.id} className="card">
                      <h3>{trial.title}</h3>
                      <p className="card-meta">Condition: {trial.condition}</p>
                      <p className="card-meta">Status: {trial.status}</p>
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
                  <p className="empty-state">No clinical trials found. Complete your profile to get recommendations.</p>
                )}
              </section>

              <section className="dashboard-section">
                <h2>Recommended Publications</h2>
                <div className="cards-grid">
                  {publications.slice(0, 3).map((pub) => (
                    <div key={pub.id} className="card">
                      <h3>{pub.title}</h3>
                      <p className="card-meta">Journal: {pub.journal}</p>
                      <p className="card-description">{pub.abstract?.substring(0, 150)}...</p>
                      {pub.ai_summary && (
                        <div className="ai-summary">
                          <strong>AI Summary:</strong> {pub.ai_summary}
                        </div>
                      )}
                      {pub.full_text_url && (
                        <a href={pub.full_text_url} target="_blank" rel="noopener noreferrer" className="link-button">
                          Read Full Paper
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                {publications.length === 0 && (
                  <p className="empty-state">No publications found.</p>
                )}
              </section>

              <section className="dashboard-section">
                <h2>Recommended Health Experts</h2>
                {loadingData ? (
                  <p>Loading experts...</p>
                ) : (
                  <>
                    {experts && experts.length > 0 ? (
                      <div className="cards-grid">
                        {experts.slice(0, 3).map((expert) => (
                          <div key={expert.id} className="card">
                            <h3>{expert.name || 'Expert'}</h3>
                            {expert.specialties && expert.specialties.length > 0 && (
                              <p className="card-meta">Specialties: {expert.specialties.join(', ')}</p>
                            )}
                            {expert.research_interests && expert.research_interests.length > 0 && (
                              <p className="card-meta">Research Interests: {expert.research_interests.join(', ')}</p>
                            )}
                            {expert.location && (
                              <p className="card-meta">Location: {expert.location}</p>
                            )}
                            <p className="card-meta">
                              <strong>Status:</strong> {expert.is_platform_member ? 'Platform Member' : 'External Expert'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-state">No experts found. Researchers who complete their profiles will appear here.</p>
                    )}
                  </>
                )}
              </section>
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
    </div>
  );
};

export default PatientDashboard;

