import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STATUSES = ['all', 'pending', 'accepted', 'declined', 'forwarded'];

const sampleRequests = [];

const MeetingRequests = ({ researcherName }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [requests, setRequests] = useState(sampleRequests);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/experts/meeting-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const mapped = (res.data || []).map(r => ({
          id: r.id,
          name: r.patient_name || 'Patient',
          contact: r.patient_contact || '',
          reason: r.message || '—',
          datetime: r.created_at ? new Date(r.created_at).toISOString().slice(0,16).replace('T',' ') : '',
          status: r.status || 'pending',
        }));
        setRequests(mapped);
      } catch (_) {}
    };
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    return requests.filter(r => (
      (status === 'all' || r.status === status) &&
      (
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.contact.toLowerCase().includes(query.toLowerCase()) ||
        r.reason.toLowerCase().includes(query.toLowerCase())
      )
    ));
  }, [requests, status, query]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const updateStatus = (id, newStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <div className="page-content meeting-requests-page" role="region" aria-label="Meeting Requests">
      <div className="forums-header" style={{ marginBottom: 10 }}>
        <h1>Meeting Requests</h1>
        <div aria-hidden style={{ color: '#6b7280' }}>for {researcherName}</div>
      </div>

      <div className="filters-section" aria-label="Filters">
        <div className="search-bar" role="search">
          <input
            type="text"
            placeholder="Search by name, contact, or reason..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            aria-label="Search requests"
          />
          <select
            className="filter-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filter by status"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="meeting-requests-list" role="list">
        {paginated.map(req => (
          <div key={req.id} className="meeting-request-card" role="listitem">
            <div className="mr-main">
              <div className="mr-title" aria-label={`Requester ${req.name}`}>{req.name}</div>
              <div className="mr-meta">
                <span>{req.contact}</span>
                <span>•</span>
                <span>{req.datetime}</span>
              </div>
              <div className="mr-reason" aria-label="Reason">{req.reason}</div>
            </div>
            <div className="mr-side">
              <span className={`mr-status mr-status-${req.status}`}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span>
              <div className="mr-actions" aria-label="Actions">
                <button className="secondary-button" onClick={() => updateStatus(req.id, 'declined')} aria-label={`Decline request from ${req.name}`}>Decline</button>
                <button className="primary-button" onClick={() => updateStatus(req.id, 'accepted')} aria-label={`Accept request from ${req.name}`}>Accept</button>
              </div>
            </div>
          </div>
        ))}
        {paginated.length === 0 && (
          <p className="empty-state">No meeting requests match your filters.</p>
        )}
      </div>

      <div className="pagination" role="navigation" aria-label="Pagination">
        <button className="secondary-button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">Prev</button>
        <span className="page-indicator" aria-live="polite">Page {page} of {totalPages}</span>
        <button className="secondary-button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">Next</button>
      </div>
    </div>
  );
};

export default MeetingRequests;


