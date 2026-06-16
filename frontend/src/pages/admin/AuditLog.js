import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import './AuditLog.css';

const ACTION_COLORS = {
  CREATE_MEDICINE: 'badge-green',
  UPDATE_MEDICINE: 'badge-blue',
  DELETE_MEDICINE: 'badge-red',
  CREATE_TREATMENT:'badge-purple',
  UPDATE_TREATMENT:'badge-blue',
  BULK_IMPORT:     'badge-yellow',
};

export default function AuditLog() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    setLoading(true);
    API.get(`/reports/audit-log?page=${page}&limit=30`)
      .then(res => { setLogs(res.data.logs); setPagination(res.data.pagination); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/></div>;

  return (
    <div className="page">
      <div className="animate-in" style={{marginBottom:24}}>
        <h1 className="section-title">📋 Audit Log</h1>
        <p className="section-sub">{pagination.total || 0} total action records</p>
      </div>

      {logs.length === 0 ? (
        <div style={{textAlign:'center',padding:'80px 0',color:'var(--text-2)'}}>
          <div style={{fontSize:48}}>📋</div>
          <p style={{marginTop:12}}>No audit logs yet</p>
        </div>
      ) : (
        <>
          <div className="audit-table-wrap card animate-in" style={{padding:0}}>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>IP</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id}>
                    <td>
                      <div className="audit-user">
                        <div className="audit-avatar">{log.user?.name?.[0] || '?'}</div>
                        <div>
                          <p className="audit-name">{log.user?.name || 'Unknown'}</p>
                          <p className="text-faint text-xs">{log.userRole}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ACTION_COLORS[log.action] || 'badge-gray'}`}>{log.action?.replace(/_/g,' ')}</span></td>
                    <td>
                      {log.entityName ? (
                        <div>
                          <p className="text-sm font-bold">{log.entityName}</p>
                          <p className="text-faint text-xs">{log.entity}</p>
                        </div>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="text-faint text-xs font-mono">{log.ipAddress || '—'}</td>
                    <td className="text-faint text-sm">
                      {new Date(log.createdAt).toLocaleDateString()}<br/>
                      <span style={{fontSize:11}}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination animate-in" style={{marginTop:16}}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <span className="text-muted text-sm">Page {page} of {pagination.pages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.pages,p+1))} disabled={page===pagination.pages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
