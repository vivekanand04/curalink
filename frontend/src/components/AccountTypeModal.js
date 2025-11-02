import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../pages/Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AccountTypeModal = ({ isOpen, onClose, currentUserType }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(currentUserType === 'patient' ? 'researcher' : 'patient');
  const [loading, setLoading] = useState(false);

  const handleChangeAccountType = async () => {
    if (selectedType === currentUserType) {
      toast.info('You are already using this account type');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/auth/change-account-type`,
        { userType: selectedType },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Update token in localStorage
      localStorage.setItem('token', response.data.token);
      
      toast.success('Account type changed successfully! Please log in again.');
      onClose();
      
      // Logout and redirect to login
      logout();
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      console.error('Error changing account type:', error);
      toast.error(error.response?.data?.message || 'Failed to change account type');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content account-type-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Account Type</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="account-type-body">
          <p className="account-type-description">
            Select the account type you want to switch to. You'll be logged out and redirected to the appropriate dashboard.
          </p>
          
          <div className="account-type-options">
            <label className={`account-type-option ${selectedType === 'patient' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="accountType"
                value="patient"
                checked={selectedType === 'patient'}
                onChange={(e) => setSelectedType(e.target.value)}
              />
              <div className="option-content">
                <div className="option-title">Patient/Caregiver</div>
                <div className="option-description">
                  Access clinical trials, publications, health experts, and forums
                </div>
              </div>
            </label>

            <label className={`account-type-option ${selectedType === 'researcher' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="accountType"
                value="researcher"
                checked={selectedType === 'researcher'}
                onChange={(e) => setSelectedType(e.target.value)}
              />
              <div className="option-content">
                <div className="option-title">Researcher</div>
                <div className="option-description">
                  Manage clinical trials, connect with collaborators, and share publications
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="primary-button" 
            onClick={handleChangeAccountType}
            disabled={loading || selectedType === currentUserType}
          >
            {loading ? 'Changing...' : 'Change Account Type'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountTypeModal;

