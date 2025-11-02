import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../pages/Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProfileModal = ({ isOpen, onClose, userType }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, userType]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = userType === 'patient' 
        ? `${API_URL}/patients/profile`
        : `${API_URL}/researchers/profile`;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load profile');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>My Profile</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="profile-modal-body">
          {!profile ? (
            <div className="profile-empty-state">
              <p>Profile not completed yet.</p>
              <p className="profile-empty-hint">
                Complete your onboarding to create your profile.
              </p>
            </div>
          ) : (
            <div className="profile-details">
              {userType === 'patient' ? (
                <>
                  <div className="profile-field">
                    <label>Name</label>
                    <div className="profile-value">{profile.name || 'Not set'}</div>
                  </div>
                  <div className="profile-field">
                    <label>Email</label>
                    <div className="profile-value">{user?.email || 'Not set'}</div>
                  </div>
                  <div className="profile-field">
                    <label>Date of Birth</label>
                    <div className="profile-value">{profile.date_of_birth || 'Not set'}</div>
                  </div>
                  <div className="profile-field">
                    <label>Conditions</label>
                    <div className="profile-value">
                      {profile.conditions && Array.isArray(profile.conditions) 
                        ? profile.conditions.join(', ') 
                        : 'None'}
                    </div>
                  </div>
                  <div className="profile-field">
                    <label>Account Type</label>
                    <div className="profile-value">Patient/Caregiver</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="profile-field">
                    <label>Name</label>
                    <div className="profile-value">{profile.name || 'Not set'}</div>
                  </div>
                  <div className="profile-field">
                    <label>Email</label>
                    <div className="profile-value">{user?.email || 'Not set'}</div>
                  </div>
                  <div className="profile-field">
                    <label>Institution</label>
                    <div className="profile-value">{profile.institution || 'Not set'}</div>
                  </div>
                  <div className="profile-field">
                    <label>Specialties</label>
                    <div className="profile-value">
                      {profile.specialties && Array.isArray(profile.specialties)
                        ? profile.specialties.join(', ')
                        : 'None'}
                    </div>
                  </div>
                  <div className="profile-field">
                    <label>Research Interests</label>
                    <div className="profile-value">
                      {profile.research_interests && Array.isArray(profile.research_interests)
                        ? profile.research_interests.join(', ')
                        : 'None'}
                    </div>
                  </div>
                  <div className="profile-field">
                    <label>Account Type</label>
                    <div className="profile-value">Researcher</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

