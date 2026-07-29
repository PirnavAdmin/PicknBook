/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function Logs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'API'; // API, Login, Activity

  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('API'); 
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLogs(b2bAdminService.getLogs());
  }, []);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const filtered = logs.filter(l => {
    if (l.type !== activeTab) return false;
    
    const query = search.toLowerCase();
    return (
      l.details.toLowerCase().includes(query) ||
      l.user.toLowerCase().includes(query) ||
      l.id.toLowerCase().includes(query)
    );
  });

  const clearAll = () => {
    setLogs([]);
  };

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">System Log Audits</h1>
          <p className="b2b-subtitle">Audit trails of user authentications, API communication, and admin modifications.</p>
        </div>
        <button className="b2b-btn b2b-btn-danger" onClick={clearAll}>
          🗑️ Clear Current Log View
        </button>
      </div>

      <div className="b2b-tabs">
        {['API', 'Login', 'Activity'].map(tab => (
          <button
            key={tab}
            className={`b2b-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setSearchParams({ tab });
            }}
          >
            {tab} Log Tracks
          </button>
        ))}
      </div>

      <div className="b2b-card">
        <div className="b2b-filter-bar">
          <div className="b2b-search">
            <span className="b2b-search-icon">🔍</span>
            <input 
              type="text" 
              className="b2b-input" 
              placeholder="Search details or operators in log trail..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="b2b-table-wrap">
          <table className="b2b-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Operator User</th>
                <th>Log Event Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{l.id}</td>
                    <td style={{ fontWeight: '600' }}>{l.user}</td>
                    <td>{l.details}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--b2b-muted)' }}>{l.timestamp}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--b2b-muted)' }}>
                    No audit logs recorded for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Logs;
