import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import './ScanHistory.css';

export default function ScanHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all'); // all | found | not_found

  useEffect(() => {
    API.get('/medicines/scan-history')
      .then(({ data }) => setHistory(data.history || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = history.filter(s => {
    if (filter === 'found')     return s.found;
    if (filter === 'not_found') return !s.found;
    return true;
  });

  const foundCount   = history.filter(s => s.found).length;
  const accuracy     = history.length > 0 ? ((foundCount / history.length) * 100).toFixed(1) : 0;

  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/><p>Loading history…</p></div>;

  return (
    <div className="page page-md">
      {/* Header */}
      <div className="sh-header animate-in">
        <div>
          <h1 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:26,height:26,color:'var(--primary)'}}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Scan History
          </h1>
          <p className="section-sub">{history.length} total scans recorded</p>
        </div>
        <Link to="/scan" className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9V6a3 3 0 013-3h3M15 3h3a3 3 0 013 3v3M3 15v3a3 3 0 003 3h3m6 0h3a3 3 0 003-3v-3M3 12h18"/></svg>
          New Scan
        </Link>
      </div>

      {/* Stats row — System Efficiency from research paper */}
      <div className="sh-stats animate-in">
        <div className="sh-stat">
          <span className="sh-stat-val text-primary">{history.length}</span>
          <span className="sh-stat-label">Total Scans</span>
        </div>
        <div className="sh-stat">
          <span className="sh-stat-val text-success">{foundCount}</span>
          <span className="sh-stat-label">Successful</span>
        </div>
        <div className="sh-stat">
          <span className="sh-stat-val text-danger">{history.length - foundCount}</span>
          <span className="sh-stat-label">Not Found</span>
        </div>
        <div className="sh-stat" title="Efficiency = Successful Retrievals / Total Scans × 100">
          <span className="sh-stat-val" style={{color:'var(--purple)'}}>{accuracy}%</span>
          <span className="sh-stat-label">Efficiency</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="sh-filters animate-in">
        {[['all','All'], ['found','Found'], ['not_found','Not Found']].map(([v,l]) => (
          <button key={v} className={`sh-filter-btn ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:'80px 0',color:'var(--text-2)'}}>
          <div style={{fontSize:48,marginBottom:16}}>📋</div>
          <h3 style={{marginBottom:8}}>No scans yet</h3>
          <p>Start scanning medicines to build your history.</p>
          <Link to="/scan" className="btn btn-primary mt-4">Open Scanner</Link>
        </div>
      ) : (
        <div className="sh-table-wrap animate-in">
          <table className="sh-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine / Code</th>
                <th>Status</th>
                <th>Type</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s._id}>
                  <td className="row-num text-faint">{i + 1}</td>
                  <td>
                    {s.medicine ? (
                      <Link to={`/medicine/${s.medicine._id}`} className="sh-med-link">
                        {s.medicine.qrCode && (
                          <img src={s.medicine.qrCode} alt="" className="sh-qr-thumb" />
                        )}
                        <div>
                          <p className="sh-med-name">{s.medicine.name}</p>
                          {s.medicine.brand && <p className="text-faint text-xs">{s.medicine.brand}</p>}
                        </div>
                      </Link>
                    ) : s.patient ? (
                      <Link to={`/patient/${s.patient._id}`} className="sh-med-link">
                        <div className="sh-pat-avatar">{s.patient.name?.[0]}</div>
                        <div>
                          <p className="sh-med-name">{s.patient.name}</p>
                          <p className="text-faint text-xs">{s.patient.patientId}</p>
                        </div>
                      </Link>
                    ) : (
                      <span className="font-mono text-sm text-faint">
                        {s.rawData?.slice(0, 32)}{s.rawData?.length > 32 ? '…' : ''}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${s.found ? 'green' : 'red'}`}>
                      {s.found ? '✓ Found' : '✗ Not Found'}
                    </span>
                  </td>
                  <td><span className="badge badge-blue">{s.scanType}</span></td>
                  <td className="text-faint text-sm">
                    {new Date(s.createdAt).toLocaleDateString()}<br/>
                    <span style={{fontSize:11}}>{new Date(s.createdAt).toLocaleTimeString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
