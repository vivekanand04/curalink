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
  const [favoritesByDoi, setFavoritesByDoi] = useState({}); // for items without numeric id
  const [doiToPublicationId, setDoiToPublicationId] = useState({}); // map DOI->db id
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
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    // Load current researcher's profile to help identify ownership by author name
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/researchers/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data?.name) setProfileName(res.data.name);
      } catch (e) {
        // non-blocking
      }
    };
    loadProfile();
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
      const response = await axios.get(`${API_URL}/publications/mine`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const myPubs = Array.isArray(response.data) ? response.data : [];
      setPublications(myPubs);
    } catch (error) {
      toast.error('Failed to fetch publications');
    } finally {
      setLoading(false);
    }
  };

  const resolveDbPublicationId = async (pub) => {
    const numericId = Number(pub?.id);
    if (Number.isInteger(numericId) && numericId > 0) return numericId;

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    const doiKey = (pub?.doi || '').trim().toLowerCase();
    const titleKey = (pub?.title || '').trim().toLowerCase();

    // 1) known mapping
    if (doiKey && doiToPublicationId[doiKey]) return doiToPublicationId[doiKey];

    // 2) look up in DB by DOI or title
    try {
      const allRes = await axios.get(`${API_URL}/publications`, { headers });
      const all = Array.isArray(allRes.data) ? allRes.data : [];
      let found = null;
      if (doiKey) {
        found = all.find(p => (p.doi || '').trim().toLowerCase() === doiKey);
      }
      if (!found && titleKey) {
        found = all.find(p => (p.title || '').trim().toLowerCase() === titleKey);
      }
      if (found?.id) {
        const idNum = Number(found.id);
        if (Number.isInteger(idNum) && idNum > 0) {
          if (doiKey) setDoiToPublicationId(prev => ({ ...prev, [doiKey]: idNum }));
          return idNum;
        }
      }
    } catch (_) {
      // ignore lookup failure; we will try create
    }

    // 3) create minimal DB record then return its id
    try {
      const payload = {
        title: pub?.title || 'Untitled',
        authors: Array.isArray(pub?.authors) ? pub.authors : (pub?.authors ? [pub.authors] : []),
        journal: pub?.journal || null,
        publicationDate: pub?.publication_date || null,
        doi: pub?.doi || null,
        abstract: pub?.abstract || null,
        fullTextUrl: pub?.full_text_url || null,
      };
      const createRes = await axios.post(`${API_URL}/publications`, payload, { headers });
      const newId = Number(createRes.data?.id);
      if (Number.isInteger(newId) && newId > 0) {
        if ((pub?.doi || '').trim()) {
          const key = (pub.doi || '').trim().toLowerCase();
          setDoiToPublicationId(prev => ({ ...prev, [key]: newId }));
        }
        return newId;
      }
    } catch (e) {
      console.error('Failed to create DB record for publication before favoriting:', e);
      toast.error('Could not prepare publication to like');
    }

    return null;
  };

  const handleToggleFavorite = async (pubOrId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const pub = typeof pubOrId === 'object' ? pubOrId : { id: pubOrId };
      const numericId = await resolveDbPublicationId(pub);
      if (!numericId) return; // error already toasted

      // Determine current fav state (id-based if numeric, else DOI/title-based)
      const idKey = `publication_${numericId}`;
      const doiKey = (pub?.doi || '').trim().toLowerCase();
      const titleKey = (pub?.title || '').trim().toLowerCase();
      const nonIdKey = doiKey || titleKey || '';
      const isFavorite = favorites[idKey] || (nonIdKey && favoritesByDoi[nonIdKey]);
      
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`${API_URL}/favorites/publication/${numericId}`, { headers });
        setFavorites(prev => {
          const newFavs = { ...prev };
          delete newFavs[idKey];
          return newFavs;
        });
        if (nonIdKey) setFavoritesByDoi(prev => ({ ...prev, [nonIdKey]: false }));
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        await axios.post(`${API_URL}/favorites`, {
          itemType: 'publication',
          itemId: numericId,
        }, { headers });
        setFavorites(prev => ({
          ...prev,
          [idKey]: true
        }));
        if (nonIdKey) setFavoritesByDoi(prev => ({ ...prev, [nonIdKey]: true }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite (publication):', error);
      toast.error(error.response?.data?.message || 'Failed to update favorites');
    }
  };

  const toggleAISummary = (pubId) => {
    setExpandedAISummaries(prev => ({
      ...prev,
      [pubId]: !prev[pubId]
    }));
  };

  const handleViewPublication = (pub) => {
    const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : null;
    const url = pub.full_text_url || doiUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.info('No link available for this publication');
    }
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
    <div className="page-content researcher-publications-page">
      <div className="forums-header">
        <h1>Publications</h1>
        <button onClick={() => setShowForm(true)} className="primary-button">
          Add
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
              <div
                className="card-favorite-icon"
                onClick={() => handleToggleFavorite(pub)}
              >
                {(() => {
                  const numericId = Number(pub.id);
                  const hasNumeric = Number.isInteger(numericId) && numericId > 0;
                  const doiKey = (pub?.doi || '').trim().toLowerCase();
                  const titleKey = (pub?.title || '').trim().toLowerCase();
                  const nonIdKey = doiKey || titleKey || '';
                  const isFav = hasNumeric
                    ? !!favorites[`publication_${numericId}`]
                    : !!favoritesByDoi[nonIdKey];
                  return (
                    <span className={`star-icon ${isFav ? 'star-filled' : ''}`}>
                      {isFav ? '★' : '☆'}
                    </span>
                  );
                })()}
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
                  <span className="action-link" onClick={() => handleViewPublication(pub)} aria-label="View">
                    <span className="action-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill="currentColor"/>
                        <circle cx="12" cy="12" r="3" fill="currentColor"/>
                      </svg>
                    </span>
                    <span className="action-label">View</span>
                  </span>
                  <span className="action-link" onClick={() => handleEdit(pub)} aria-label="Edit">
                    <span className="action-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" fill="currentColor"/>
                        <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82Z" fill="currentColor"/>
                      </svg>
                    </span>
                    <span className="action-label">Edit</span>
                  </span>
                  <span className="action-link" onClick={() => handleDelete(pub.id)} style={{ color: '#dc3545' }} aria-label="Delete">
                    <span className="action-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 7h12l-1 13H7L6 7Z" fill="currentColor"/>
                        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2h3v2H6V7h3Zm2 0h2V5h-2v2Z" fill="currentColor"/>
                      </svg>
                    </span>
                    <span className="action-label">Delete</span>
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

