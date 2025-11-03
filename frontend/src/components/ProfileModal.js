import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../pages/Dashboard.css';
import { normalizeOrFallback } from '../utils/conditionNormalizer';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProfileModal = ({ isOpen, onClose, userType, onProfileUpdate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Patient form data
  const [patientFormData, setPatientFormData] = useState({
    name: '',
    age: '',
    conditions: [],
    currentCondition: '',
    locationCity: '',
    locationCountry: '',
    symptoms: '',
  });
  
  // Researcher form data
  const [researcherFormData, setResearcherFormData] = useState({
    name: '',
    specialties: [],
    currentSpecialty: '',
    researchInterests: [],
    currentInterest: '',
    orcidId: '',
    researchgateId: '',
    availabilityForMeetings: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, userType]);

  const fetchProfile = async () => {
    setLoading(true);
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
      const profileData = response.data;
      setProfile(profileData);
      
      // Populate form data based on user type
      if (userType === 'patient') {
        if (profileData && Object.keys(profileData).length > 0) {
          setPatientFormData({
            name: profileData.name || '',
            age: profileData.age?.toString() || '',
            conditions: profileData.conditions || [],
            currentCondition: '',
            locationCity: profileData.location_city || '',
            locationCountry: profileData.location_country || '',
            symptoms: profileData.symptoms || '',
          });
        } else {
          // Initialize with empty values for new profile
          setPatientFormData({
            name: '',
            age: '',
            conditions: [],
            currentCondition: '',
            locationCity: '',
            locationCountry: '',
            symptoms: '',
          });
        }
      } else if (userType === 'researcher') {
        if (profileData && Object.keys(profileData).length > 0) {
          setResearcherFormData({
            name: profileData.name || '',
            specialties: profileData.specialties || [],
            currentSpecialty: '',
            researchInterests: profileData.research_interests || [],
            currentInterest: '',
            orcidId: profileData.orcid_id || '',
            researchgateId: profileData.researchgate_id || '',
            availabilityForMeetings: profileData.availability_for_meetings || false,
          });
        } else {
          // Initialize with empty values for new profile
          setResearcherFormData({
            name: '',
            specialties: [],
            currentSpecialty: '',
            researchInterests: [],
            currentInterest: '',
            orcidId: '',
            researchgateId: '',
            availabilityForMeetings: false,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 404) {
        // Profile doesn't exist yet - initialize empty form
        if (userType === 'patient') {
          setPatientFormData({
            name: '',
            age: '',
            conditions: [],
            currentCondition: '',
            locationCity: '',
            locationCountry: '',
            symptoms: '',
          });
        } else {
          setResearcherFormData({
            name: '',
            specialties: [],
            currentSpecialty: '',
            researchInterests: [],
            currentInterest: '',
            orcidId: '',
            researchgateId: '',
            availabilityForMeetings: false,
          });
        }
        setProfile(null);
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    const input = patientFormData.currentCondition;
    if (!input || !input.trim()) return;

    const normalizedList = normalizeOrFallback(input);

    const existing = new Set((patientFormData.conditions || []).map((c) => c.trim()));
    for (const label of normalizedList) {
      if (!existing.has(label)) {
        existing.add(label);
      }
    }

    setPatientFormData({
      ...patientFormData,
      conditions: Array.from(existing),
      currentCondition: '',
    });
  };

  const removeCondition = (index) => {
    setPatientFormData({
      ...patientFormData,
      conditions: patientFormData.conditions.filter((_, i) => i !== index),
    });
  };

  const addSpecialty = () => {
    if (researcherFormData.currentSpecialty.trim()) {
      setResearcherFormData({
        ...researcherFormData,
        specialties: [...researcherFormData.specialties, researcherFormData.currentSpecialty.trim()],
        currentSpecialty: '',
      });
    }
  };

  const removeSpecialty = (index) => {
    setResearcherFormData({
      ...researcherFormData,
      specialties: researcherFormData.specialties.filter((_, i) => i !== index),
    });
  };

  const addInterest = () => {
    if (researcherFormData.currentInterest.trim()) {
      setResearcherFormData({
        ...researcherFormData,
        researchInterests: [...researcherFormData.researchInterests, researcherFormData.currentInterest.trim()],
        currentInterest: '',
      });
    }
  };

  const removeInterest = (index) => {
    setResearcherFormData({
      ...researcherFormData,
      researchInterests: researcherFormData.researchInterests.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      if (userType === 'patient') {
        if (!patientFormData.name || !patientFormData.age || patientFormData.conditions.length === 0) {
          toast.error('Please fill in all required fields');
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_URL}/patients/profile`, {
          name: patientFormData.name,
          age: parseInt(patientFormData.age),
          conditions: patientFormData.conditions,
          locationCity: patientFormData.locationCity,
          locationCountry: patientFormData.locationCountry,
          symptoms: patientFormData.symptoms,
        }, { headers });

        setProfile(response.data);
        setEditing(false);
        toast.success('Profile updated successfully!');
        // Trigger profile refresh in parent component
        if (onProfileUpdate) {
          onProfileUpdate(response.data);
        }
      } else {
        if (!researcherFormData.name || researcherFormData.specialties.length === 0) {
          toast.error('Please fill in all required fields');
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_URL}/researchers/profile`, {
          name: researcherFormData.name,
          specialties: researcherFormData.specialties,
          researchInterests: researcherFormData.researchInterests,
          orcidId: researcherFormData.orcidId || null,
          researchgateId: researcherFormData.researchgateId || null,
          availabilityForMeetings: researcherFormData.availabilityForMeetings,
          publications: profile?.publications ? (typeof profile.publications === 'string' ? JSON.parse(profile.publications) : profile.publications) : [],
        }, { headers });

        setProfile(response.data);
        setEditing(false);
        toast.success('Profile updated successfully!');
        // Trigger profile refresh in parent component
        if (onProfileUpdate) {
          onProfileUpdate(response.data);
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
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
          {loading ? (
            <div className="profile-loading-state">
              <p>Loading the profile, wait for response...</p>
            </div>
          ) : !profile && !editing ? (
            <div className="profile-empty-state">
              <p>Profile not completed yet.</p>
              <p className="profile-empty-hint">
                Click "Create Profile" to set up your profile now.
              </p>
            </div>
          ) : editing ? (
            <div className="profile-edit-form">
              {userType === 'patient' ? (
                <>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={patientFormData.name}
                      onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      value={patientFormData.age}
                      onChange={(e) => setPatientFormData({ ...patientFormData, age: e.target.value })}
                      placeholder="Enter your age"
                    />
                  </div>
                  <div className="form-group">
                    <label>Conditions *</label>
                    <div className="condition-input">
                      <input
                        type="text"
                        value={patientFormData.currentCondition}
                        onChange={(e) => setPatientFormData({ ...patientFormData, currentCondition: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                        placeholder="e.g., Brain Cancer, Heart Disease"
                      />
                      <button type="button" onClick={addCondition} className="add-button">
                        Add
                      </button>
                    </div>
                    <div className="conditions-list">
                      {patientFormData.conditions.map((condition, index) => (
                        <span key={index} className="condition-tag">
                          {condition}
                          <button type="button" onClick={() => removeCondition(index)}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={patientFormData.locationCity}
                      onChange={(e) => setPatientFormData({ ...patientFormData, locationCity: e.target.value })}
                      placeholder="Enter your city"
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      value={patientFormData.locationCountry}
                      onChange={(e) => setPatientFormData({ ...patientFormData, locationCountry: e.target.value })}
                      placeholder="Enter your country"
                    />
                  </div>
                  <div className="form-group">
                    <label>Symptoms (Optional)</label>
                    <textarea
                      value={patientFormData.symptoms}
                      onChange={(e) => setPatientFormData({ ...patientFormData, symptoms: e.target.value })}
                      placeholder="Describe your symptoms"
                      rows="4"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={researcherFormData.name}
                      onChange={(e) => setResearcherFormData({ ...researcherFormData, name: e.target.value })}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Specialties *</label>
                    <div className="condition-input">
                      <input
                        type="text"
                        value={researcherFormData.currentSpecialty}
                        onChange={(e) => setResearcherFormData({ ...researcherFormData, currentSpecialty: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                        placeholder="e.g., Oncology, Neurology"
                      />
                      <button type="button" onClick={addSpecialty} className="add-button">
                        Add
                      </button>
                    </div>
                    <div className="conditions-list">
                      {researcherFormData.specialties.map((specialty, index) => (
                        <span key={index} className="condition-tag">
                          {specialty}
                          <button type="button" onClick={() => removeSpecialty(index)}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Research Interests</label>
                    <div className="condition-input">
                      <input
                        type="text"
                        value={researcherFormData.currentInterest}
                        onChange={(e) => setResearcherFormData({ ...researcherFormData, currentInterest: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                        placeholder="e.g., Immunotherapy, Clinical AI"
                      />
                      <button type="button" onClick={addInterest} className="add-button">
                        Add
                      </button>
                    </div>
                    <div className="conditions-list">
                      {researcherFormData.researchInterests.map((interest, index) => (
                        <span key={index} className="condition-tag">
                          {interest}
                          <button type="button" onClick={() => removeInterest(index)}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>ORCID ID (Optional)</label>
                    <input
                      type="text"
                      value={researcherFormData.orcidId}
                      onChange={(e) => setResearcherFormData({ ...researcherFormData, orcidId: e.target.value })}
                      placeholder="Enter your ORCID ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>ResearchGate ID (Optional)</label>
                    <input
                      type="text"
                      value={researcherFormData.researchgateId}
                      onChange={(e) => setResearcherFormData({ ...researcherFormData, researchgateId: e.target.value })}
                      placeholder="Enter your ResearchGate ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={researcherFormData.availabilityForMeetings}
                        onChange={(e) => setResearcherFormData({ ...researcherFormData, availabilityForMeetings: e.target.checked })}
                      />
                      Available for meetings with patients
                    </label>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="profile-details">
              {userType === 'patient' ? (
                <>
                  <div className="profile-field profile-field-inline">
                    <label>Email:</label>
                    <span className="profile-value">{user?.email || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Name:</label>
                    <span className="profile-value">{profile.name || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Age:</label>
                    <span className="profile-value">{profile.age || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Conditions:</label>
                    <span className="profile-value">
                      {profile.conditions && Array.isArray(profile.conditions) 
                        ? profile.conditions.join(', ') 
                        : 'None'}
                    </span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Location:</label>
                    <span className="profile-value">
                      {profile.location_city || profile.location_country 
                        ? `${profile.location_city || ''}${profile.location_city && profile.location_country ? ', ' : ''}${profile.location_country || ''}`
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Symptoms:</label>
                    <span className="profile-value">{profile.symptoms || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Account Type:</label>
                    <span className="profile-value">Patient/Caregiver</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="profile-field profile-field-inline">
                    <label>Email:</label>
                    <span className="profile-value">{user?.email || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Name:</label>
                    <span className="profile-value">{profile.name || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Specialties:</label>
                    <span className="profile-value">
                      {profile.specialties && Array.isArray(profile.specialties)
                        ? profile.specialties.join(', ')
                        : 'None'}
                    </span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Research Interests:</label>
                    <span className="profile-value">
                      {profile.research_interests && Array.isArray(profile.research_interests)
                        ? profile.research_interests.join(', ')
                        : 'None'}
                    </span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>ORCID ID:</label>
                    <span className="profile-value">{profile.orcid_id || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>ResearchGate ID:</label>
                    <span className="profile-value">{profile.researchgate_id || 'Not set'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Available for Meetings:</label>
                    <span className="profile-value">{profile.availability_for_meetings ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="profile-field profile-field-inline">
                    <label>Account Type:</label>
                    <span className="profile-value">Researcher</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {editing ? (
            <>
              <button className="secondary-button" onClick={() => {
                setEditing(false);
                fetchProfile(); // Reset form data
              }} disabled={loading}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : profile ? 'Save Changes' : 'Create Profile'}
              </button>
            </>
          ) : (
            <>
              <button className="primary-button" onClick={() => setEditing(true)}>
                {profile ? 'Edit Profile' : 'Create Profile'}
              </button>
              <button className="secondary-button" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

