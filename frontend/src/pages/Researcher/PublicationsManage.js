import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PublicationsManage = () => {
  const [publications, setPublications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
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
  }, []);

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

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const authorsArray = formData.authors.split(',').map(a => a.trim()).filter(a => a);
      
      await axios.post(`${API_URL}/publications`, {
        title: formData.title,
        authors: authorsArray,
        journal: formData.journal || null,
        publicationDate: formData.publicationDate || null,
        doi: formData.doi || null,
        abstract: formData.abstract || null,
        fullTextUrl: formData.fullTextUrl || null,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success('Publication added successfully');
      setShowForm(false);
      setFormData({
        title: '',
        authors: '',
        journal: '',
        publicationDate: '',
        doi: '',
        abstract: '',
        fullTextUrl: '',
      });
      fetchPublications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add publication');
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
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Publication</h2>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Publication title"
              />
            </div>
            <div className="form-group">
              <label>Authors (comma-separated)</label>
              <input
                type="text"
                value={formData.authors}
                onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                placeholder="Author 1, Author 2, Author 3"
              />
            </div>
            <div className="form-group">
              <label>Journal</label>
              <input
                type="text"
                value={formData.journal}
                onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                placeholder="Journal name"
              />
            </div>
            <div className="form-group">
              <label>Publication Date</label>
              <input
                type="date"
                value={formData.publicationDate}
                onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>DOI</label>
              <input
                type="text"
                value={formData.doi}
                onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                placeholder="DOI"
              />
            </div>
            <div className="form-group">
              <label>Abstract</label>
              <textarea
                value={formData.abstract}
                onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                placeholder="Publication abstract"
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Full Text URL</label>
              <input
                type="url"
                value={formData.fullTextUrl}
                onChange={(e) => setFormData({ ...formData, fullTextUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="form-actions">
              <button onClick={() => setShowForm(false)} className="secondary-button">
                Cancel
              </button>
              <button onClick={handleSubmit} className="primary-button">
                Add Publication
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="cards-grid">
          {publications.map((pub) => (
            <div key={pub.id} className="card">
              <h3>{pub.title}</h3>
              {pub.authors && pub.authors.length > 0 && (
                <p className="card-meta">
                  <strong>Authors:</strong> {pub.authors.join(', ')}
                </p>
              )}
              {pub.journal && (
                <p className="card-meta">
                  <strong>Journal:</strong> {pub.journal}
                </p>
              )}
              {pub.publication_date && (
                <p className="card-meta">
                  <strong>Published:</strong> {new Date(pub.publication_date).toLocaleDateString()}
                </p>
              )}
              {pub.abstract && (
                <p className="card-description">{pub.abstract.substring(0, 200)}...</p>
              )}
              {pub.ai_summary && (
                <div className="ai-summary">
                  <strong>AI Summary:</strong> {pub.ai_summary}
                </div>
              )}
              {pub.full_text_url && (
                <a
                  href={pub.full_text_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-button primary-button"
                  style={{ display: 'inline-block', marginTop: '10px' }}
                >
                  Read Full Paper
                </a>
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

