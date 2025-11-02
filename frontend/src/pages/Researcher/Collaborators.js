import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Collaborators = () => {
  const [collaborators, setCollaborators] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    fetchConnections();
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const params = {};
      if (specialtyFilter) params.specialty = specialtyFilter;
      
      const response = await axios.get(`${API_URL}/collaborators/search`, { params, headers });
      setCollaborators(response.data);
    } catch (error) {
      toast.error('Failed to fetch collaborators');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/collaborators/connections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setConnections(response.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const params = {};
      if (searchQuery) params.query = searchQuery;
      if (specialtyFilter) params.specialty = specialtyFilter;
      
      const response = await axios.get(`${API_URL}/collaborators/search`, { params, headers });
      setCollaborators(response.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
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
      toast.success('Connection request sent');
      fetchConnections();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send connection request');
    }
  };

  const handleAcceptReject = async (connectionId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/collaborators/connections/${connectionId}`, { status }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success(`Connection ${status}ed`);
      fetchConnections();
    } catch (error) {
      toast.error('Failed to update connection');
    }
  };

  const handleAddFavorite = async (collaboratorId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/favorites`, {
        itemType: 'collaborator',
        itemId: collaboratorId,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Added to favorites');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to favorites');
    }
  };

  const getConnectionStatus = (collaboratorId) => {
    const connection = connections.find(
      (conn) =>
        (conn.requester_id === collaboratorId || conn.receiver_id === collaboratorId) &&
        conn.status !== 'rejected'
    );
    return connection?.status || null;
  };

  return (
    <div className="page-content">
      <h1>Collaborators</h1>
      <p className="subtitle">Find and connect with other researchers</p>

      <div className="tabs-section">
        <button
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search Collaborators
        </button>
        <button
          className={`tab-button ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          My Connections ({connections.filter((c) => c.status === 'accepted').length})
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="collaborators-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by name, specialty, or research interest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <select
              value={specialtyFilter}
              onChange={(e) => {
                setSpecialtyFilter(e.target.value);
                handleSearch();
              }}
              className="filter-select"
              style={{ marginLeft: '10px', padding: '8px' }}
            >
              <option value="">All Specialties</option>
              <option value="Oncology">Oncology</option>
              <option value="Neurology">Neurology</option>
              <option value="Immunology">Immunology</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Cancer Research">Cancer Research</option>
            </select>
            <button onClick={handleSearch} className="primary-button">
              Search
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="cards-grid">
              {collaborators.map((collaborator) => {
                const connectionStatus = getConnectionStatus(collaborator.user_id);
                return (
                  <div key={collaborator.user_id} className="card">
                    <h3>{collaborator.name}</h3>
                    {collaborator.specialties && collaborator.specialties.length > 0 && (
                      <p className="card-meta">
                        <strong>Specialties:</strong> {collaborator.specialties.join(', ')}
                      </p>
                    )}
                    {collaborator.research_interests && collaborator.research_interests.length > 0 && (
                      <p className="card-meta">
                        <strong>Research Interests:</strong> {collaborator.research_interests.join(', ')}
                      </p>
                    )}
                    {(() => {
                      const pubCount = collaborator.publications 
                        ? (Array.isArray(collaborator.publications) 
                            ? collaborator.publications.length 
                            : JSON.parse(collaborator.publications || '[]').length)
                        : 0;
                      return pubCount > 0 && (
                        <p className="card-meta">
                          <strong>Publications:</strong> {pubCount} publication{pubCount !== 1 ? 's' : ''}
                        </p>
                      );
                    })()}
                    {collaborator.email && (
                      <p className="card-meta">
                        <strong>Email:</strong> {collaborator.email}
                      </p>
                    )}
                    <div className="card-actions">
                      {connectionStatus === null && (
                        <>
                          <button
                            onClick={() => handleConnect(collaborator.user_id)}
                            className="primary-button"
                          >
                            Connect
                          </button>
                          <button
                            onClick={() => handleAddFavorite(collaborator.user_id)}
                            className="secondary-button"
                            style={{ marginLeft: '10px' }}
                          >
                            Add to Favorites
                          </button>
                        </>
                      )}
                      {connectionStatus === 'pending' && (
                        <span className="status-badge">Pending</span>
                      )}
                      {connectionStatus === 'accepted' && (
                        <>
                          <span className="status-badge accepted">Connected</span>
                          <button
                            onClick={() => handleAddFavorite(collaborator.user_id)}
                            className="secondary-button"
                            style={{ marginLeft: '10px' }}
                          >
                            Add to Favorites
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {collaborators.length === 0 && !loading && (
            <p className="empty-state">No collaborators found. Try adjusting your search.</p>
          )}
        </div>
      )}

      {activeTab === 'connections' && (
        <div className="connections-section">
          <h2>My Connections</h2>
          <div className="cards-grid">
            {connections.map((conn) => (
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
                {conn.status === 'pending' && (
                  <div className="card-actions">
                    <button
                      onClick={() => handleAcceptReject(conn.id, 'accepted')}
                      className="primary-button"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAcceptReject(conn.id, 'rejected')}
                      className="danger-button"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {connections.length === 0 && (
            <p className="empty-state">No connection requests yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Collaborators;

