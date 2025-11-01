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
  const [profile, setProfile] = useState(null);
  const [clinicalTrials, setClinicalTrials] = useState([]);
  const [publications, setPublications] = useState([]);
  const [experts, setExperts] = useState([]);
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
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const [trialsRes, publicationsRes, expertsRes] = await Promise.all([
        axios.get(`${API_URL}/clinical-trials/personalized`, { headers }),
        axios.get(`${API_URL}/publications/personalized`, { headers }),
        axios.get(`${API_URL}/experts/personalized`, { headers }),
      ]);

      setClinicalTrials(trialsRes.data);
      setPublications(publicationsRes.data);
      setExperts(expertsRes.data);
    } catch (error) {
      console.error('Error fetching personalized data:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">CuraLink</div>
        <div className="nav-tabs">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'experts' ? 'active' : ''}
            onClick={() => setActiveTab('experts')}
          >
            Health Experts
          </button>
          <button
            className={activeTab === 'trials' ? 'active' : ''}
            onClick={() => setActiveTab('trials')}
          >
            Clinical Trials
          </button>
          <button
            className={activeTab === 'publications' ? 'active' : ''}
            onClick={() => setActiveTab('publications')}
          >
            Publications
          </button>
          <button
            className={activeTab === 'forums' ? 'active' : ''}
            onClick={() => setActiveTab('forums')}
          >
            Forums
          </button>
          <button
            className={activeTab === 'favorites' ? 'active' : ''}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
        </div>
        <div className="nav-user">
          <span>Welcome, {profile?.name || user?.email}</span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
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
                <div className="cards-grid">
                  {experts.slice(0, 3).map((expert) => (
                    <div key={expert.id} className="card">
                      <h3>{expert.name}</h3>
                      <p className="card-meta">Specialties: {expert.specialties?.join(', ')}</p>
                      {expert.location && <p className="card-meta">Location: {expert.location}</p>}
                    </div>
                  ))}
                </div>
                {experts.length === 0 && (
                  <p className="empty-state">No experts found.</p>
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
  );
};

export default PatientDashboard;

