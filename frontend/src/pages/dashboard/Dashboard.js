import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth, API } from '../../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,                    setStats]                    = useState(null);
  const [history,                  setHistory]                  = useState([]);
  const [saved,                    setSaved]                    = useState([]);
  const [treatments,               setTreatments]               = useState([]);
  const [diseases,                 setDiseases]                 = useState([]);
  const [selectedDisease,          setSelectedDisease]          = useState(null);
  const [selectedDiseaseTreatments,setSelectedDiseaseTreatments]= useState([]);
  const [searchTerm,               setSearchTerm]               = useState('');
  const [nextFollowUp,             setNextFollowUp]             = useState(null);
  const [activeMedications,        setActiveMedications]        = useState([]);
  const [warningAlerts,            setWarningAlerts]            = useState([]);
  const [loading,                  setLoading]                  = useState(true);
  const [refreshing,               setRefreshing]               = useState(false);

  const isPrivileged = user?.role === 'admin' || user?.role === 'pharmacist' || user?.role === 'doctor';
  const isPatient    = user?.role === 'patient';

  const getNextFollowUp = (records) => {
    const now = new Date();
    const upcoming = [];

    records.forEach(tx => {
      if (Array.isArray(tx.visits)) {
        tx.visits.forEach(v => {
          if (!v?.date) return;
          const visitDate = new Date(v.date);
          if (visitDate > now) upcoming.push({
            date: visitDate,
            disease: tx.disease,
            note: v.notes || tx.notes || tx.hospital,
          });
        });
      }

      if (tx.status === 'follow_up') {
        const followDate = tx.endDate ? new Date(tx.endDate) : tx.startDate ? new Date(tx.startDate) : null;
        if (followDate && followDate > now) {
          upcoming.push({ date: followDate, disease: tx.disease, note: tx.notes || tx.hospital });
        }
      }
    });

    if (!upcoming.length) return null;
    return upcoming.sort((a, b) => a.date - b.date)[0];
  };

  const getActiveMedications = (records) => {
    const meds = [];
    records.forEach(tx => {
      (tx.prescriptions || []).forEach(p => {
        const name = p.medicineName || p.medicine?.name;
        if (!name) return;
        if (!meds.find(m => m.name === name)) {
          meds.push({
            name,
            status: p.status,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            condition: tx.disease,
          });
        }
      });
    });
    return meds;
  };

  const getWarningAlerts = (patient, records) => {
    const alerts = [];
    if (patient?.allergies?.length) {
      alerts.push(`Allergy alert: ${patient.allergies.join(', ')}`);
    }

    const severeConditions = [...new Set(records.filter(tx => tx.severity === 'severe').map(tx => tx.disease))];
    if (severeConditions.length) {
      alerts.push(`Severe condition(s): ${severeConditions.join(', ')}`);
    }

    if (!alerts.length && patient?.allergies?.length === 0) {
      alerts.push('No allergy alerts found. Keep your list updated.');
    }

    return alerts;
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [
        API.get('/medicines/scan-history'),
        API.get('/auth/me'),
      ];
      if (isPrivileged) promises.push(API.get('/medicines/dashboard'));
      if (isPatient) promises.push(API.get('/treatments'));

      const results = await Promise.all(promises);
      setHistory(results[0].data.history || []);
      setSaved(results[1].data.user?.savedMedicines || []);
      if (isPrivileged && results[2]) setStats(results[2].data);

      if (isPatient) {
        const treatmentsData = results[2 + (isPrivileged ? 1 : 0)]?.data?.treatments || [];
        setTreatments(treatmentsData);
        const uniqueDiseases = [...new Set(treatmentsData.map(tx => tx.disease).filter(Boolean))];
        setDiseases(uniqueDiseases);
        setNextFollowUp(getNextFollowUp(treatmentsData));
        setActiveMedications(getActiveMedications(treatmentsData));
        setWarningAlerts(getWarningAlerts(results[1].data.user, treatmentsData));
      } else {
        setWarningAlerts(getWarningAlerts(results[1].data.user, []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isPrivileged, isPatient]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 300000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const openDiseaseDetails = (disease) => {
    setSelectedDisease(disease);
    setSelectedDiseaseTreatments(treatments.filter(tx => tx.disease === disease));
    setSearchTerm('');
  };

  const closeDiseaseModal = () => {
    setSelectedDisease(null);
    setSelectedDiseaseTreatments([]);
    setSearchTerm('');
  };

  const downloadPatientReport = async () => {
    try {
      const response = await API.get(`/reports/patient/${user?._id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${user?.patientId || user?.name || 'patient'}_records.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download report.');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/><p>Loading dashboard…</p></div>;

  const expBadge = (s) => s==='expired'?'badge-red':s==='near_expiry'?'badge-yellow':'badge-green';
  const roleColor = { admin:'red', doctor:'purple', pharmacist:'green', patient:'blue' };
  const visibleSelectedTreatments = selectedDiseaseTreatments.filter(tx => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const text = [
      tx.hospital,
      tx.doctorName,
      tx.notes,
      tx.disease,
      (tx.prescriptions || []).map(p => p.medicineName || p.medicine?.name).join(' '),
      (tx.visits || []).map(v => v.notes).filter(Boolean).join(' '),
    ].join(' ').toLowerCase();
    return text.includes(term);
  });

  return (
    <div className="page">
      {/* Welcome hero */}
      <div className="dash-hero animate-in">
        <div className="dash-welcome">
          <div className="dash-avatar">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{user?.name?.[0]}</span>}
          </div>
          <div>
            <p className="text-faint text-sm">Welcome back</p>
            <h1>Hello, {user?.name?.split(' ')[0]} 👋</h1>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
              <span className={`badge badge-${roleColor[user?.role]||'blue'}`}>{user?.role}</span>
              {user?.patientId && <span className="font-mono text-sm text-faint">{user.patientId}</span>}
            </div>
          </div>
        </div>
        <div className="dash-hero-actions">
          <Link to="/scan" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9V6a3 3 0 013-3h3M15 3h3a3 3 0 013 3v3M3 15v3a3 3 0 003 3h3m6 0h3a3 3 0 003-3v-3M3 12h18"/></svg>
            Scan Medicine
          </Link>
          {isPrivileged && <Link to="/add-medicine" className="btn btn-secondary">+ Add Medicine</Link>}
          {user?.role === 'patient' && user?.qrCode && (
            <button className="btn btn-secondary" onClick={() => {
              const a = document.createElement('a'); a.href = user.qrCode;
              a.download = `${user.patientId}_QR.png`; a.click();
            }}>⬇ My QR Card</button>
          )}
        </div>
      </div>

      {/* Admin / Doctor / Pharmacist stats — based on Table I from research paper */}
      {isPrivileged && stats && (
        <>
          <div className="stats-grid animate-in">
            {[
              { label:'Total Medicines',   value: stats.stats.totalMedicines,   icon:'💊', color:'blue' },
              { label:'Expired',           value: stats.stats.expiredMedicines, icon:'⚠️', color:'red' },
              { label:'Near Expiry',       value: stats.stats.nearExpiryMedicines, icon:'🕐', color:'yellow' },
              { label:'Total Scans',       value: stats.stats.totalScans,       icon:'📱', color:'green' },
              { label:'Accuracy',          value: `${stats.accuracy}%`,         icon:'🎯', color:'purple', note:'Successful retrievals / total scans × 100' },
              { label:'Total Patients',    value: stats.stats.totalPatients,    icon:'🧑‍⚕️', color:'blue' },
            ].map(s => (
              <div key={s.label} className={`stat-card stat-${s.color}`} title={s.note||''}>
                <div className="stat-emoji">{s.icon}</div>
                <div className="stat-val">{String(s.value)}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {stats.categoryStats?.length > 0 && (
            <div className="card animate-in mb-section">
              <h3 className="card-title">Medicine Categories</h3>
              <div className="cat-bars">
                {stats.categoryStats.slice(0,8).map(c => {
                  const pct = Math.round((c.count/stats.stats.totalMedicines)*100);
                  return (
                    <div key={c._id} className="cat-bar-row">
                      <span className="cat-bar-label">{c._id}</span>
                      <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${pct}%`}}/></div>
                      <span className="cat-bar-count">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent scans table */}
          {stats.recentScans?.length > 0 && (
            <div className="card animate-in mb-section">
              <div className="card-header-row">
                <h3 className="card-title">Recent Activity</h3>
                <Link to="/scan-history" className="btn btn-ghost btn-sm">View all →</Link>
              </div>
              <div className="recent-scans">
                {stats.recentScans.map(s => (
                  <div key={s._id} className="recent-row">
                    <div className={`scan-dot ${s.found?'found':'not-found'}`}/>
                    <div className="recent-info">
                      <span className="recent-user">{s.user?.name || 'Unknown'}</span>
                      <span className="recent-med text-muted text-sm">{s.medicine?.name || '—'}</span>
                    </div>
                    <span className={`badge badge-${s.found?'green':'red'}`}>{s.found?'Found':'Not Found'}</span>
                    <span className="text-faint text-xs">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Patient QR card display */}
      {user?.role === 'patient' && user?.qrCode && (
        <div className="patient-qr-section card animate-in mb-section">
          <div className="pqr-left">
            <h3>Your Patient QR Card</h3>
            <p className="text-muted text-sm">Doctors and pharmacists can scan this to view your medical records instantly.</p>
            <div className="pqr-info">
              <div><span className="text-faint text-xs">Patient ID</span><p className="font-mono font-bold">{user.patientId}</p></div>
              {user.bloodGroup && <div><span className="text-faint text-xs">Blood Group</span><p className="font-bold text-danger">{user.bloodGroup}</p></div>}
              {user.allergies?.length > 0 && <div><span className="text-faint text-xs">Allergies</span><p className="text-sm">{user.allergies.join(', ')}</p></div>}
            </div>
          </div>
          <div className="pqr-right">
            <div className="pqr-img-wrap">
              <img src={user.qrCode} alt="Patient QR" />
            </div>
            <p className="text-faint text-xs text-center mt-2">Do not share with unauthorized persons</p>
          </div>
        </div>
      )}

      {selectedDisease && (
        <div className="modal-backdrop" onClick={closeDiseaseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedDisease}</h3>
                <p className="text-faint text-sm">Tap outside or use close to dismiss</p>
              </div>
              <button type="button" className="modal-close" onClick={closeDiseaseModal}>×</button>
            </div>
            <div className="modal-search-row">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search treatments, doctor, hospital, notes..."
              />
              <span className="text-faint text-xs">Showing {visibleSelectedTreatments.length}/{selectedDiseaseTreatments.length}</span>
            </div>
            <div className="modal-body">
              {visibleSelectedTreatments.length > 0 ? visibleSelectedTreatments.map(tx => (
                <div key={tx._id} className="modal-treatment-card">
                  <div className="modal-treatment-header">
                    <span className={`badge badge-${tx.status==='ongoing'?'blue':tx.status==='recovered'?'green':tx.status==='follow_up'?'yellow':'red'}`}>{tx.status.replace('_',' ')}</span>
                    <span className="text-faint text-xs">{tx.type?.replace('_',' ') || 'Treatment'}</span>
                    {tx.severity && <span className={`badge badge-${tx.severity==='severe'?'red':tx.severity==='moderate'?'yellow':'green'}`}>{tx.severity}</span>}
                  </div>
                  <div className="modal-treatment-meta">
                    {tx.hospital && <span>🏥 {tx.hospital}</span>}
                    {tx.doctorName && <span>👨‍⚕️ {tx.doctorName}</span>}
                    {tx.startDate && <span>Start: {new Date(tx.startDate).toLocaleDateString()}</span>}
                    {tx.endDate && <span>End: {new Date(tx.endDate).toLocaleDateString()}</span>}
                  </div>
                  {tx.notes && <p className="modal-notes">{tx.notes}</p>}
                  {tx.prescriptions?.length > 0 && (
                    <div className="modal-prescriptions">
                      <h4>Prescriptions</h4>
                      <ul>
                        {tx.prescriptions.map((p, idx) => (
                          <li key={idx}>
                            <strong>{p.medicineName || p.medicine?.name}</strong>
                            {p.dosage && ` • ${p.dosage}`}
                            {p.frequency && ` • ${p.frequency}`}
                            {p.duration && ` • ${p.duration}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tx.visits?.length > 0 && (
                    <div className="modal-visits">
                      <h4>Visit history</h4>
                      <ul>
                        {tx.visits.map((v, idx) => (
                          <li key={idx}>
                            <strong>{v.date ? new Date(v.date).toLocaleDateString() : 'Unknown date'}</strong>
                            {v.notes && ` — ${v.notes}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )) : (
                <div className="empty-state" style={{ padding:'18px' }}>
                  <p>No treatment details match your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPatient && (
        <div className="card animate-in mb-section patient-health-overview">
          <div className="card-header-row">
            <h3 className="card-title">Health Snapshot</h3>
            <div className="card-actions">
              <button className="btn btn-ghost btn-sm" onClick={refreshDashboard} disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={downloadPatientReport}>Download Report</button>
            </div>
          </div>
          <div className="health-metrics-grid">
            <div className="health-card">
              <span className="health-card-label">Active conditions</span>
              <strong>{diseases.length}</strong>
            </div>
            <div className="health-card">
              <span className="health-card-label">Active medicines</span>
              <strong>{activeMedications.length}</strong>
            </div>
            <div className="health-card">
              <span className="health-card-label">Upcoming follow-up</span>
              <strong>{nextFollowUp ? new Date(nextFollowUp.date).toLocaleDateString() : 'None scheduled'}</strong>
            </div>
            <div className="health-card">
              <span className="health-card-label">Alerts</span>
              <strong>{warningAlerts.length}</strong>
            </div>
          </div>
          <div className="health-summary-row">
            <div className="health-summary-box">
              <h4>Allergy & safety</h4>
              <ul>
                {warningAlerts.map((alert, idx) => (
                  <li key={idx}>{alert}</li>
                ))}
              </ul>
            </div>
            <div className="health-summary-box">
              <h4>Active medication summary</h4>
              {activeMedications.length > 0 ? (
                <ul className="medication-list">
                  {activeMedications.slice(0, 5).map((med, idx) => (
                    <li key={idx}>
                      <strong>{med.name}</strong>
                      <span>{med.dosage || med.frequency || med.duration ? ` • ${med.dosage || ''}${med.dosage && med.frequency ? ', ' : ''}${med.frequency || ''}${med.duration ? ` • ${med.duration}` : ''}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-faint text-sm">No active prescriptions saved yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isPatient && (
        <div className="card animate-in mb-section">
          <div className="card-header-row">
            <h3 className="card-title">My Diagnosis</h3>
          </div>
          {diseases.length > 0 ? (
            <div className="disease-badges" style={{ display:'flex', flexWrap:'wrap', gap:'10px', padding:'12px 0' }}>
              {diseases.map((disease, index) => (
                <button key={index} type="button" className="badge badge-purple disease-badge-button" onClick={() => openDiseaseDetails(disease)} style={{ padding:'8px 12px', fontSize:'0.92rem' }}>{disease}</button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding:'24px 12px' }}>
              <span style={{fontSize:36}}>💚</span>
              <p>No diagnosis records found yet.</p>
              <p className="text-faint text-sm">Ask your doctor to add your conditions so they appear here.</p>
            </div>
          )}
        </div>
      )}

      {isPatient && diseases.length > 0 && (
        <div className="card animate-in mb-section">
          <div className="card-header-row">
            <h3 className="card-title">Treatment Progress</h3>
          </div>
          <div className="progress-grid">
            {diseases.map((disease, index) => {
              const diseaseTreatments = treatments
                .filter(tx => tx.disease === disease)
                .sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
              const latest = diseaseTreatments[0] || {};
              const progress = latest.status === 'recovered' ? 100 : latest.status === 'follow_up' ? 80 : latest.status === 'ongoing' ? 60 : 40;
              return (
                <div key={index} className="progress-card">
                  <div className="progress-card-title">
                    <h4>{disease}</h4>
                    <span className={`badge badge-${latest.status === 'ongoing' ? 'blue' : latest.status === 'recovered' ? 'green' : latest.status === 'follow_up' ? 'yellow' : 'red'}`}>
                      {latest.status?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                  <div className="progress-card-meta">
                    {latest.severity && <span>Severity: {latest.severity}</span>}
                    {latest.doctorName && <span>Dr. {latest.doctorName}</span>}
                  </div>
                  <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>
                  <p className="text-faint text-sm">{latest.hospital || 'No hospital recorded'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dash-two-col">
        {/* Scan History */}
        <div className="card animate-in">
          <div className="card-header-row">
            <h3 className="card-title">My Scan History</h3>
            <Link to="/scan-history" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <span style={{fontSize:36}}>📷</span>
              <p>No scans yet. Start scanning medicines!</p>
              <Link to="/scan" className="btn btn-primary btn-sm">Open Scanner</Link>
            </div>
          ) : (
            <div className="history-list">
              {history.slice(0,8).map(s => (
                <div key={s._id} className="hist-row">
                  <div className={`scan-dot ${s.found?'found':'not-found'}`}/>
                  <div className="hist-info">
                    {s.medicine
                      ? <Link to={`/medicine/${s.medicine._id}`} className="hist-name">{s.medicine.name}</Link>
                      : <span className="hist-name text-muted">Unknown</span>}
                    <span className="text-faint text-xs">{new Date(s.createdAt).toLocaleDateString()} · {s.scanType}</span>
                  </div>
                  <span className={`badge badge-${s.found?'green':'red'}`}>{s.found?'Found':'Not Found'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Medicines */}
        <div className="card animate-in">
          <div className="card-header-row">
            <h3 className="card-title">Saved Medicines</h3>
            <Link to="/medicines" className="btn btn-ghost btn-sm">Browse →</Link>
          </div>
          {saved.length === 0 ? (
            <div className="empty-state">
              <span style={{fontSize:36}}>💊</span>
              <p>Save frequently used medicines for quick access.</p>
              <Link to="/medicines" className="btn btn-secondary btn-sm">Browse Medicines</Link>
            </div>
          ) : (
            <div className="saved-list">
              {saved.map(m => (
                <Link key={m._id} to={`/medicine/${m._id}`} className="saved-row">
                  <div>
                    <p className="hist-name">{m.name}</p>
                    {m.brand && <p className="text-faint text-xs">{m.brand}</p>}
                  </div>
                  <span className={`badge ${expBadge(m.expiryStatus)}`}>
                    {m.expiryStatus==='expired'?'Expired':m.expiryStatus==='near_expiry'?'Near Expiry':'Valid'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
