import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-content">
          <h1 className="landing-title">Welcome to CuraLink</h1>
          <p className="landing-subtitle">
            Connecting patients, caregivers, and researchers to discover clinical trials, 
            medical publications, and health experts
          </p>
          
          <div className="cta-buttons">
            <button 
              className="cta-button patient-cta"
              onClick={() => navigate('/register?type=patient')}
            >
              I am a Patient or Caregiver
            </button>
            <button 
              className="cta-button researcher-cta"
              onClick={() => navigate('/register?type=researcher')}
            >
              I am a Researcher
            </button>
          </div>

          <div className="landing-features">
            <div className="feature-card">
              <h3>Clinical Trials</h3>
              <p>Discover relevant clinical trials based on your condition</p>
            </div>
            <div className="feature-card">
              <h3>Health Experts</h3>
              <p>Connect with specialists and researchers in your field</p>
            </div>
            <div className="feature-card">
              <h3>Publications</h3>
              <p>Access the latest medical research and publications</p>
            </div>
          </div>

          <p className="landing-footer">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

