import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-content">
          <div className="lp-progress-track" aria-hidden>
            <div className="lp-progress-bar" style={{ width: '0%' }} />
            <div className="lp-progress-dot" style={{ left: '33%' }} />
            <div className="lp-progress-dot-end" style={{ left: '66%' }} />
          </div>
          <h1 className="landing-title">Welcome to CuraLink</h1>
          <p className="landing-subtitle">
            Empowering Health Connections.
            <br />
            AI-Driven Insights for Patients & Researchers.
          </p>
          
          <div className="cta-buttons">
            <button 
              className="cta-button patient-cta"
              onClick={() => navigate('/register?type=patient')}
            >
              Find Support & Solutions
            </button>
            <button 
              className="cta-button researcher-cta"
              onClick={() => navigate('/register?type=researcher')}
            >
              Advance Research
            </button>
          </div>

          <div className="landing-features">
            <div className="feature-card">
              <div style={{ fontSize: 28, marginBottom: 10 }}>🧪</div>
              <h3>Clinical Trials</h3>
              <p>Discover relevant trials based on your condition</p>
            </div>
            <div className="feature-card">
              <div style={{ fontSize: 28, marginBottom: 10 }}>🧑‍⚕️</div>
              <h3>Health Experts</h3>
              <p>Connect with specialists and researchers</p>
            </div>
            <div className="feature-card">
              <div style={{ fontSize: 28, marginBottom: 10 }}>📖</div>
              <h3>Publications</h3>
              <p>Access the latest medical research</p>
            </div>
          </div>

          <p className="landing-footer">
            Already have an account? <a onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

