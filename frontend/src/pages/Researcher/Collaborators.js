import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Collaborators = () => {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [connections, setConnections] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    fetchConnections();
    fetchCollaborators();
    fetchFavorites();
    if (activeTab === 'messages') {
      fetchConversations();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.collaborator_id);
      // Poll for new messages every 3 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedChat.collaborator_id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

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

  const findConnection = (collaboratorId) => {
    const collabId = parseInt(collaboratorId);
    const me = parseInt(user?.id);
    return connections.find(conn => {
      const requesterId = parseInt(conn.requester_id);
      const receiverId = parseInt(conn.receiver_id);
      const match = (requesterId === me && receiverId === collabId) || (receiverId === me && requesterId === collabId);
      return match && conn.status !== 'rejected';
    });
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

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/collaborators/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const map = {};
      response.data.forEach(fav => {
        if (fav.item_type === 'collaborator') {
          map[`collaborator_${fav.item_id}`] = true;
        }
      });
      setFavorites(map);
    } catch (error) {
      // non-blocking
    }
  };

  const handleToggleFavorite = async (collaboratorId) => {
    try {
      const token = localStorage.getItem('token');
      const key = `collaborator_${collaboratorId}`;
      if (favorites[key]) {
        await axios.delete(`${API_URL}/favorites/collaborator/${collaboratorId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API_URL}/favorites`, { itemType: 'collaborator', itemId: collaboratorId }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => ({ ...prev, [key]: true }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update favorites');
    }
  };

  const fetchMessages = async (collaboratorId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/collaborators/messages/${collaboratorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/collaborators/messages`, {
        receiverId: selectedChat.collaborator_id,
        message: newMessage
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNewMessage('');
      fetchMessages(selectedChat.collaborator_id);
      fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const getConnectionStatus = (collaboratorId) => {
    const conn = findConnection(collaboratorId);
    if (!conn) return null;
    const isReceiver = parseInt(conn.receiver_id) === parseInt(user?.id);
    if (conn.status === 'pending') {
      return isReceiver ? 'incoming_pending' : 'outgoing_pending';
    }
    return conn.status;
  };

  const handleAcceptRequest = async (collaboratorId) => {
    try {
      const token = localStorage.getItem('token');
      const conn = findConnection(collaboratorId);
      if (!conn) return;
      await axios.put(`${API_URL}/collaborators/connections/${conn.id}`, { status: 'accepted' }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Connection accepted');
      await fetchConnections();
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleCancelRequest = async (collaboratorId) => {
    try {
      const token = localStorage.getItem('token');
      const conn = findConnection(collaboratorId);
      if (!conn) return;
      await axios.put(`${API_URL}/collaborators/connections/${conn.id}`, { status: 'rejected' }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Request canceled');
      await fetchConnections();
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const openChat = async (collab) => {
    setSelectedChat({ collaborator_id: collab.user_id, collaborator_name: collab.name });
    await fetchMessages(collab.user_id);
    setShowChatModal(true);
  };
  
  const handleChatClick = async (collab) => {
    const status = getConnectionStatus(collab.user_id);
    if (status === 'accepted') {
      await openChat(collab);
    } else {
      toast.info('Connect first');
    }
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
        <button
          className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('messages');
            fetchConversations();
          }}
        >
          Messages
          {conversations.some(c => c.unread_count > 0) && (
            <span style={{ marginLeft: '5px', background: '#ff4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '12px' }}>
              {conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)}
            </span>
          )}
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
                const universities = [
                  'Stanford University',
                  'Harvard University',
                  'MIT',
                  'University of Oxford',
                  'University of Cambridge',
                  'Johns Hopkins University',
                  'UC Berkeley',
                  'UCLA',
                  'Imperial College London',
                  'Karolinska Institute'
                ];
                const getUniversityForId = (id) => {
                  const n = parseInt(id, 10);
                  if (Number.isNaN(n)) return universities[0];
                  return universities[Math.abs(n) % universities.length];
                };
                const university = getUniversityForId(collaborator.user_id);
                const pubs = collaborator.publications
                  ? (Array.isArray(collaborator.publications)
                    ? collaborator.publications
                    : JSON.parse(collaborator.publications || '[]'))
                  : [];
                const recentCount = pubs.length;
                return (
                  <div key={collaborator.user_id} className="collab-card">
                    <div className="collab-card-main">
                      <div className="collab-card-content">
                        <h3 className="collab-card-title">{collaborator.name}</h3>
                        <div className="collab-card-subtitle">
                          {(collaborator.specialties && collaborator.specialties.length > 0)
                            ? `${collaborator.specialties[0]} • ${university}`
                            : `Researcher • ${university}`}
                        </div>
                        {(collaborator.research_interests && collaborator.research_interests.length > 0) && (
                          <div className="collab-card-tags">
                            {collaborator.research_interests.slice(0, 2).map((interest, idx) => (
                              <span key={idx} className="collab-chip">{interest}</span>
                            ))}
                          </div>
                        )}
                        <div
                          className="collab-card-meta clickable"
                          onClick={() => setSelectedProfile(collaborator)}
                        >
                          {recentCount} recent publications
                        </div>
                      </div>
                       <button
                         className={`collab-fav ${favorites[`collaborator_${collaborator.user_id}`] ? 'active' : ''}`}
                         onClick={() => handleToggleFavorite(collaborator.user_id)}
                         aria-label="Toggle favorite"
                       >
                         {favorites[`collaborator_${collaborator.user_id}`] ? '★' : '☆'}
                       </button>
                    </div>
                    <div className="collab-card-actions">
                      {connectionStatus === 'accepted' ? (
                        <button className="collab-button-primary" disabled>Connected</button>
                      ) : connectionStatus === 'incoming_pending' ? (
                        <button className="collab-button-primary" onClick={() => handleAcceptRequest(collaborator.user_id)}>Accept Request</button>
                      ) : connectionStatus === 'outgoing_pending' ? (
                        <button className="collab-button-primary" onClick={() => handleCancelRequest(collaborator.user_id)}>Pending Request</button>
                      ) : (
                        <button className="collab-button-primary" onClick={() => handleConnect(collaborator.user_id)}>Connect</button>
                      )}
                      <button className="collab-button-outline" type="button" onClick={() => setSelectedProfile(collaborator)}>View Profile</button>
                      <button className="collab-button-outline" type="button" onClick={() => handleChatClick(collaborator)}>Chat</button>
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
                {conn.status === 'accepted' && (
                  <div className="card-actions">
                    <button
                      onClick={() => {
                        setActiveTab('messages');
                        // Determine the collaborator ID (the other person in the connection)
                        const currentUserId = user?.id;
                        const collaboratorId = conn.requester_id === currentUserId ? conn.receiver_id : conn.requester_id;
                        setSelectedChat({ collaborator_id: collaboratorId, collaborator_name: conn.name });
                        fetchConversations();
                      }}
                      className="primary-button"
                    >
                      Chat
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

      {activeTab === 'messages' && (
        <div className="messages-section" style={{ display: 'flex', height: '600px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ width: '300px', borderRight: '1px solid #ddd', overflowY: 'auto' }}>
            <h3 style={{ padding: '15px', margin: 0, borderBottom: '1px solid #ddd' }}>Conversations</h3>
            {conversations.length === 0 ? (
              <p style={{ padding: '15px', textAlign: 'center', color: '#666' }}>No conversations yet. Connect with collaborators to start chatting!</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.collaborator_id}
                  onClick={() => {
                    setSelectedChat(conv);
                    fetchMessages(conv.collaborator_id);
                  }}
                  style={{
                    padding: '15px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    backgroundColor: selectedChat?.collaborator_id === conv.collaborator_id ? '#f0f0f0' : 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{conv.collaborator_name}</strong>
                    {conv.last_message && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_message.substring(0, 50)}...
                      </p>
                    )}
                    {conv.last_message_time && (
                      <span style={{ fontSize: '0.8em', color: '#999' }}>
                        {new Date(conv.last_message_time).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <span style={{
                      background: '#ff4444',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '4px 8px',
                      fontSize: '12px',
                      minWidth: '20px',
                      textAlign: 'center'
                    }}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedChat ? (
              <>
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
                  <h3 style={{ margin: 0 }}>{selectedChat.collaborator_name}</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px', backgroundColor: '#fafafa' }}>
                  {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>No messages yet. Start the conversation!</p>
                  ) : (
                    messages.map((msg) => {
                      const isSent = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            marginBottom: '15px',
                            display: 'flex',
                            justifyContent: isSent ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{
                            maxWidth: '70%',
                            padding: '10px 15px',
                            borderRadius: '15px',
                            backgroundColor: isSent ? '#007bff' : '#e9ecef',
                            color: isSent ? 'white' : 'black'
                          }}>
                            <div style={{ fontSize: '0.85em', marginBottom: '5px', opacity: 0.8 }}>
                              {msg.sender_name}
                            </div>
                            <div>{msg.message}</div>
                            <div style={{ fontSize: '0.75em', marginTop: '5px', opacity: 0.7 }}>
                              {new Date(msg.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{ padding: '15px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={chatLoading || !newMessage.trim()}
                    className="primary-button"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collaborator Profile Modal */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedProfile.name}</h2>
              <button className="modal-close" onClick={() => setSelectedProfile(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '10px' }}>
                {(selectedProfile.specialties && selectedProfile.specialties.length > 0)
                  ? selectedProfile.specialties.join(', ')
                  : 'Researcher'}
              </p>
              {/* Avatar + meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b7280' }}>
                  {(selectedProfile.name || 'R')[0]}
                </div>
                <div style={{ color: '#6b7280' }}>
                  {selectedProfile.email && (
                    <div style={{ fontSize: '0.9em' }}>{selectedProfile.email}</div>
                  )}
                </div>
              </div>

              {(() => {
                const universities = [
                  'Stanford University','Harvard University','MIT','University of Oxford','University of Cambridge','Johns Hopkins University','UC Berkeley','UCLA','Imperial College London','Karolinska Institute'
                ];
                const getUniversityForId = (id) => {
                  const n = parseInt(id, 10);
                  if (Number.isNaN(n)) return universities[0];
                  return universities[Math.abs(n) % universities.length];
                };
                return (
                  <p style={{ color: '#6b7280', marginTop: 0 }}>{getUniversityForId(selectedProfile.user_id)}</p>
                );
              })()}
              {selectedProfile.research_interests && selectedProfile.research_interests.length > 0 && (
                <div style={{ margin: '12px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedProfile.research_interests.slice(0, 5).map((i, idx) => (
                    <span key={idx} className="collab-chip">{i}</span>
                  ))}
                </div>
              )}
              {(() => {
                const pubs = selectedProfile.publications
                  ? (Array.isArray(selectedProfile.publications)
                    ? selectedProfile.publications
                    : JSON.parse(selectedProfile.publications || '[]'))
                  : [];
                if (pubs.length === 0) return <p className="empty-state">No publications available.</p>;
                return (
                  <div>
                    <h3>Recent Publications</h3>
                    <ul style={{ paddingLeft: '18px' }}>
                      {pubs.slice(0, 5).map((p, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{p.title || 'Untitled Publication'}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* No confirmation actions here per requirement */}
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && selectedChat && (
        <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chat with {selectedChat.collaborator_name}</h2>
              <button className="modal-close" onClick={() => setShowChatModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                {messages.length === 0 ? (
                  <p className="empty-state">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg) => {
                    const isSent = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                        <div style={{ maxWidth: '75%', background: isSent ? '#6a34f5' : '#e9ecef', color: isSent ? '#fff' : '#000', padding: '8px 12px', borderRadius: '12px' }}>
                          <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{msg.sender_name}</div>
                          <div>{msg.message}</div>
                          <div style={{ fontSize: '0.75em', opacity: 0.7, marginTop: '4px' }}>{new Date(msg.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
                <button className="primary-button" onClick={handleSendMessage} disabled={chatLoading || !newMessage.trim()}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collaborators;

