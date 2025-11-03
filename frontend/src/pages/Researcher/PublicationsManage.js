import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PublicationsManage = () => {
  const [publications, setPublications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPublication, setEditingPublication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [expandedAISummaries, setExpandedAISummaries] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    journal: '',
    publicationDate: '',
    doi: '',
    abstract: '',
    fullTextUrl: '',
  });

  useEffect(() => {
    fetchPublications();
    fetchFavorites();
  }, []);

  // Ensure external publications (ORCID/ResearchGate) are synced when ORCID/ResearchGate ID is present
  useEffect(() => {
    syncExternalPublicationsIfNeeded();
  }, []);

  const syncExternalPublicationsIfNeeded = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Fetch current researcher profile
      const profileRes = await axios.get(`${API_URL}/researchers/profile`, { headers });
      const profile = profileRes.data || {};

      const hasExternalIds = !!(profile.orcid_id || profile.researchgate_id);
      if (!hasExternalIds) return; // nothing to sync

      // Check if publications already include external sources
      const pubsRes = await axios.get(`${API_URL}/publications`, { headers });
      const existing = Array.isArray(pubsRes.data) ? pubsRes.data : [];
      const hasExternalPubs = existing.some(p => (p.source || '').toLowerCase() === 'orcid' || (p.source || '').toLowerCase() === 'researchgate');
      if (hasExternalPubs) return; // already synced

      // Re-post the profile to trigger import on the backend
      const payload = {
        name: profile.name || '',
        specialties: profile.specialties || [],
        researchInterests: profile.research_interests || [],
        orcidId: profile.orcid_id || null,
        researchgateId: profile.researchgate_id || null,
        availabilityForMeetings: profile.availability_for_meetings || false,
        publications: profile.publications ? (typeof profile.publications === 'string' ? JSON.parse(profile.publications) : profile.publications) : [],
      };

      await axios.post(`${API_URL}/researchers/profile`, payload, { headers });

      // Refresh list to include newly imported publications
      await fetchPublications();
    } catch (error) {
      console.error('External publications sync failed:', error);
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
      const favoritesMap = {};
      response.data.forEach(fav => {
        if (fav.item_type === 'publication') {
          favoritesMap[`publication_${fav.item_id}`] = true;
        }
      });
      setFavorites(favoritesMap);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/publications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPublications(response.data);
    } catch (error) {
      toast.error('Failed to fetch publications');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (pubId) => {
    try {
      const token = localStorage.getItem('token');
      const isFavorite = favorites[`publication_${pubId}`];
      
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`${API_URL}/favorites/publication/${pubId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setFavorites(prev => {
          const newFavs = { ...prev };
          delete newFavs[`publication_${pubId}`];
          return newFavs;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        await axios.post(`${API_URL}/favorites`, {
          itemType: 'publication',
          itemId: pubId,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setFavorites(prev => ({
          ...prev,
          [`publication_${pubId}`]: true
        }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update favorites');
    }
  };

  const toggleAISummary = (pubId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [pubId]: !prev[pubId]
    }));
  };

  const handleEdit = (pub) => {
    setEditingPublication(pub);
    setFormData({
      title: pub.title || '',
      authors: pub.authors ? (Array.isArray(pub.authors) ? pub.authors.join(', ') : pub.authors) : '',
      journal: pub.journal || '',
      publicationDate: pub.publication_date ? pub.publication_date.split('T')[0] : '',
      doi: pub.doi || '',
      abstract: pub.abstract || '',
      fullTextUrl: pub.full_text_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (pubId) => {
    if (!window.confirm('Are you sure you want to delete this publication?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/publications/${pubId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Publication deleted successfully');
      fetchPublications();
      fetchFavorites();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete publication');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPublication(null);
    setFormData({
      title: '',
      authors: '',
      journal: '',
      publicationDate: '',
      doi: '',
      abstract: '',
      fullTextUrl: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const authorsArray = formData.authors.split(',').map(a => a.trim()).filter(a => a);
      
      const payload = {
        title: formData.title,
        authors: authorsArray,
        journal: formData.journal || null,
        publicationDate: formData.publicationDate || null,
        doi: formData.doi || null,
        abstract: formData.abstract || null,
        fullTextUrl: formData.fullTextUrl || null,
      };

      if (editingPublication) {
        await axios.put(`${API_URL}/publications/${editingPublication.id}`, payload, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        toast.success('Publication updated successfully');
      } else {
        await axios.post(`${API_URL}/publications`, payload, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        toast.success('Publication added successfully');
      }
      
      handleCancelForm();
      fetchPublications();
      fetchFavorites();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingPublication ? 'update' : 'add'} publication`);
    }
  };

  return (
    <div className="page-content">
      <div className="forums-header">
        <h1>Publications</h1>
        <button onClick={() => setShowForm(true)} className="primary-button">
          Add Publication
        </button>
      </div>
      <p className="subtitle">Manage and add publications to the database</p>

      {showForm && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content publication-form" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingPublication ? 'Edit Publication' : 'Create New Publication'}</h2>
              <button 
                className="close-button" 
                onClick={handleCancelForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="title">Title <span className="required">*</span></label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter publication title"
                    required
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="authors">Authors <span className="required-text">(comma-separated)</span></label>
                  <input
                    id="authors"
                    type="text"
                    value={formData.authors}
                    onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                    placeholder="Author 1, Author 2, Author 3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="journal">Journal</label>
                  <input
                    id="journal"
                    type="text"
                    value={formData.journal}
                    onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                    placeholder="e.g., Nature, Science"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="publicationDate">Publication Date</label>
                  <input
                    id="publicationDate"
                    type="date"
                    value={formData.publicationDate}
                    onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="doi">DOI</label>
                  <input
                    id="doi"
                    type="text"
                    value={formData.doi}
                    onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                    placeholder="e.g., 10.1234/example"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fullTextUrl">Full Text URL</label>
                  <input
                    id="fullTextUrl"
                    type="url"
                    value={formData.fullTextUrl}
                    onChange={(e) => setFormData({ ...formData, fullTextUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="abstract">Abstract</label>
                  <textarea
                    id="abstract"
                    value={formData.abstract}
                    onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                    placeholder="Enter publication abstract"
                    rows="5"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingPublication ? 'Update Publication' : 'Create Publication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
          {publications.map((pub) => (
            <div key={pub.id} className="card modern-card publication-card">
              <div className="card-favorite-icon" onClick={() => handleToggleFavorite(pub.id)}>
                <span className={`star-icon ${favorites[`publication_${pub.id}`] ? 'star-filled' : ''}`}>
                  {favorites[`publication_${pub.id}`] ? '★' : '☆'}
                </span>
              </div>
              <h3 className="card-title">{pub.title}</h3>
              {pub.journal && pub.publication_date && (
                <p className="card-source">
                  {pub.journal} • {new Date(pub.publication_date).getFullYear()}
                </p>
              )}
              {pub.authors && pub.authors.length > 0 && (
                <p className="card-authors">
                  By {pub.authors.slice(0, 2).map(author => author.includes('Dr.') ? author : `Dr. ${author}`).join(', ')}
                  {pub.authors.length > 2 && ' et al.'}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span className="action-link" onClick={() => handleEdit(pub)}>
                    Edit
                  </span>
                  <span className="action-link" onClick={() => handleDelete(pub.id)} style={{ color: '#dc3545' }}>
                    Delete
                  </span>
                </div>
                <span className="action-link" onClick={() => toggleAISummary(pub.id)}>
                  {expandedAISummaries[pub.id] ? 'Hide AI Summary' : 'Get AI Summary'}
                </span>
              </div>
              {expandedAISummaries[pub.id] && pub.ai_summary && (
                <div className="ai-summary-container">
                  <div className="ai-summary-content">
                    {pub.ai_summary}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {publications.length === 0 && !loading && (
        <p className="empty-state">No publications yet. Add your first publication!</p>
      )}
    </div>
  );
};

export default PublicationsManage;

