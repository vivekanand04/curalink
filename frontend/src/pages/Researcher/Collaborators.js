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

  useEffect(() => {
    fetchConnections();
    fetchCollaborators();
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
                      const publications = collaborator.publications 
                        ? (Array.isArray(collaborator.publications) 
                            ? collaborator.publications 
                            : JSON.parse(collaborator.publications || '[]'))
                        : [];
                      const recentPubs = publications.slice(0, 3);
                      return publications.length > 0 && (
                        <div>
                          <p className="card-meta">
                            <strong>Publications:</strong> {publications.length} publication{publications.length !== 1 ? 's' : ''}
                          </p>
                          {recentPubs.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
                              <strong>Recent:</strong>
                              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                {recentPubs.map((pub, idx) => (
                                  <li key={idx} style={{ marginBottom: '4px' }}>
                                    {pub.title || 'Untitled Publication'}
                                    {pub.ai_summary && (
                                      <span style={{ display: 'block', fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                                        {pub.ai_summary.substring(0, 100)}...
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
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
                            onClick={() => {
                              setActiveTab('messages');
                              setSelectedChat({ collaborator_id: collaborator.user_id, collaborator_name: collaborator.name });
                              fetchConversations();
                            }}
                            className="primary-button"
                            style={{ marginLeft: '10px' }}
                          >
                            Chat
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
    </div>
  );
};

export default Collaborators;

