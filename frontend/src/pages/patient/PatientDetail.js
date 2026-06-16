import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './PatientDetail.css';

const STATUS_COLOR = { ongoing:'badge-blue', recovered:'badge-green', stopped:'badge-red', follow_up:'badge-yellow' };
const TYPE_COLOR   = { chronic:'badge-red', surgery:'badge-purple', infection:'badge-yellow', injury:'badge-yellow', other:'badge-gray' };
const SEV_COLOR    = { mild:'badge-green', moderate:'badge-yellow', severe:'badge-red' };

export default function PatientDetail() {
  const { id }   = useParams();
  const { user } = useAuth();
  const [patient,    setPatient]    = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('ongoing');
  const [expanded,   setExpanded]   = useState({});   // treatment card expand state

  useEffect(() => {
    const load = async () => {
      try {
        let patientData, treatmentsData;

        if (user?.role === 'patient') {
          // BUG FIX: patient viewing their own page — use their own _id, not URL param
          const [meRes, txRes] = await Promise.all([
            API.get('/auth/me'),
            API.get('/treatments'),
          ]);
          patientData    = meRes.data.user;
          treatmentsData = txRes.data.treatments;
        } else if (['doctor','admin','pharmacist'].includes(user?.role)) {
          const res      = await API.get(`/treatments/patient/${id}`);
          patientData    = res.data.patient;
          treatmentsData = res.data.treatments;
        } else {
          toast.error('Access denied');
          return;
        }
        setPatient(patientData);
        setTreatments(treatmentsData || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [id, user]);

  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/><p>Loading patient records…</p></div>;
  if (!patient) return <div className="page text-center"><h2>Patient not found</h2></div>;

  const ongoing   = treatments.filter(t => t.status === 'ongoing');
  const completed = treatments.filter(t => t.status !== 'ongoing');
  const displayed = activeTab === 'ongoing' ? ongoing : completed;

  // All ACTIVE medicines across all ongoing treatments (for pharmacist quick-view)
  const activeMeds = ongoing.flatMap(tx =>
    (tx.prescriptions || [])
      .filter(p => p.status === 'active')
      .map(p => ({ ...p, disease: tx.disease, doctorName: tx.doctorName }))
  );

  const toggle = (txId) => setExpanded(e => ({ ...e, [txId]: !e[txId] }));

  return (
    <div className="page">

      {/* ── Patient profile card ───────────────────────────────── */}
      <div className="patient-profile-card animate-in">
        <div className="pp-left">
          <div className="pp-avatar">{patient.name?.[0]?.toUpperCase()}</div>
          <div>
            <h1>{patient.name}</h1>
            <div className="pp-meta">
              {patient.patientId  && <span className="font-mono badge badge-blue">{patient.patientId}</span>}
              {patient.gender     && <span className="text-muted text-sm">{patient.gender}</span>}
              {patient.dateOfBirth&& <span className="text-muted text-sm">{new Date(patient.dateOfBirth).toLocaleDateString('en-IN')}</span>}
            </div>
            <div className="pp-vitals">
              {patient.bloodGroup && (
                <div className="pp-vital">
                  <span className="text-danger font-bold">🩸 {patient.bloodGroup}</span>
                  <small>Blood Group</small>
                </div>
              )}
              {patient.contact && (
                <div className="pp-vital">
                  <span>📱 {patient.contact}</span>
                  <small>Contact</small>
                </div>
              )}
              {patient.allergies?.length > 0 && (
                <div className="pp-vital allergy">
                  <span className="text-danger">⚠ {patient.allergies.join(', ')}</span>
                  <small>Allergies</small>
                </div>
              )}
            </div>
          </div>
        </div>
        {patient.qrCode && (
          <div className="pp-qr">
            <img src={patient.qrCode} alt="Patient QR" />
            <p className="text-faint text-xs text-center mt-1">Confidential — authorised scan only</p>
          </div>
        )}
      </div>

      {/* ── Pharmacist active-medicine quick-view ─────────────── */}
      {user?.role === 'pharmacist' && activeMeds.length > 0 && (
        <div className="card animate-in pharmacist-rx-card">
          <div className="pharmacist-rx-header">
            <span>💊 Current Active Prescriptions</span>
            <span className="tf-count-badge">{activeMeds.length} medicine{activeMeds.length!==1?'s':''}</span>
          </div>
          <p className="text-muted text-sm" style={{marginBottom:12}}>Medicines currently prescribed across all ongoing treatments:</p>
          <div className="pharm-med-table">
            <div className="pharm-med-row pharm-med-head">
              <span>Medicine</span>
              <span>Dosage</span>
              <span>Frequency</span>
              <span>For Condition</span>
              <span>Doctor</span>
            </div>
            {activeMeds.map((p, i) => (
              <div key={i} className="pharm-med-row">
                <span className="pharm-med-name">
                  {p.medicine
                    ? <Link to={`/medicine/${p.medicine._id}`}>{p.medicineName || p.medicine.name}</Link>
                    : <strong>{p.medicineName || '—'}</strong>}
                </span>
                <span>{p.dosage    || '—'}</span>
                <span>{p.frequency || '—'}</span>
                <span><span className="badge badge-blue">{p.disease}</span></span>
                <span>{p.doctorName ? `Dr. ${p.doctorName}` : '—'}</span>
              </div>
            ))}
          </div>
          {patient.allergies?.length > 0 && (
            <div className="pharm-allergy-alert">
              ⚠ <strong>Allergy alert:</strong> {patient.allergies.join(', ')} — check before dispensing.
            </div>
          )}
        </div>
      )}

      {/* ── Emergency Contact ─────────────────────────────────── */}
      {patient.emergencyContact?.name && (
        <div className="ec-card card animate-in">
          <h3>🚨 Emergency Contact</h3>
          <div className="ec-info">
            <span><b>Name:</b> {patient.emergencyContact.name}</span>
            <span><b>Phone:</b> {patient.emergencyContact.phone}</span>
            <span><b>Relation:</b> {patient.emergencyContact.relation}</span>
          </div>
        </div>
      )}

      {/* ── Treatment section ────────────────────────────────── */}
      <div className="treatment-section animate-in">
        <div className="treatment-header">
          <h2>Treatment Records</h2>
          {['doctor','admin'].includes(user?.role) && (
            <Link to={`/treatments/new?patient=${id}`} className="btn btn-primary btn-sm">
              + Add Treatment
            </Link>
          )}
        </div>

        <div className="treat-tabs">
          <button className={`treat-tab ${activeTab==='ongoing'?'active':''}`} onClick={()=>setActiveTab('ongoing')}>
            Ongoing <span className="tab-count">{ongoing.length}</span>
          </button>
          <button className={`treat-tab ${activeTab==='completed'?'active':''}`} onClick={()=>setActiveTab('completed')}>
            Past <span className="tab-count">{completed.length}</span>
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="empty-treatment">
            <span style={{fontSize:36}}>🏥</span>
            <p>No {activeTab} treatment records.</p>
            {['doctor','admin'].includes(user?.role) && activeTab==='ongoing' && (
              <Link to={`/treatments/new?patient=${id}`} className="btn btn-primary btn-sm" style={{marginTop:10}}>
                Add First Treatment
              </Link>
            )}
          </div>
        ) : (
          <div className="treatments-list">
            {displayed.map(tx => {
              const isOpen = expanded[tx._id];
              const prescCount = tx.prescriptions?.length || 0;
              return (
                <div key={tx._id} className={`treatment-card ${isOpen?'expanded':''}`}>

                  {/* Header — always visible */}
                  <div className="tx-header" onClick={()=>toggle(tx._id)} style={{cursor:'pointer'}}>
                    <div className="tx-title-area">
                      <div className="tx-badges">
                        <span className={`badge ${STATUS_COLOR[tx.status]||'badge-gray'}`}>{tx.status.replace('_',' ')}</span>
                        <span className={`badge ${TYPE_COLOR[tx.type]||'badge-gray'}`}>{tx.type}</span>
                        {tx.severity && <span className={`badge ${SEV_COLOR[tx.severity]||'badge-gray'}`}>{tx.severity}</span>}
                      </div>
                      <h3 className="tx-disease">{tx.disease}</h3>
                      <div className="tx-meta">
                        {tx.hospital   && <span>🏥 {tx.hospital}</span>}
                        {tx.doctorName && <span>👨‍⚕️ Dr. {tx.doctorName}</span>}
                        {prescCount > 0 && <span>💊 {prescCount} medicine{prescCount!==1?'s':''}</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                      <div className="tx-dates">
                        <div><small>Start</small><p>{new Date(tx.startDate).toLocaleDateString('en-IN')}</p></div>
                        {tx.endDate && <div><small>End</small><p>{new Date(tx.endDate).toLocaleDateString('en-IN')}</p></div>}
                      </div>
                      <span style={{fontSize:18,color:'var(--primary)'}}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expandable body */}
                  {isOpen && (
                    <div className="tx-body">
                      {['doctor','admin'].includes(user?.role) && (
                        <div className="tx-actions">
                          <Link to={`/treatments/${tx._id}/edit?patient=${id}`} className="btn btn-secondary btn-sm">
                            Edit Treatment
                          </Link>
                        </div>
                      )}

                      {tx.notes && <p className="tx-notes">{tx.notes}</p>}

                      {/* Prescriptions */}
                      {prescCount > 0 && (
                        <div className="tx-prescriptions">
                          <h4>💊 Prescription / Treatment</h4>
                          <div className="tx-presc-list">
                            {tx.prescriptions.map((p, i) => (
                              <div key={i} className="presc-item">
                                <div className="presc-name">
                                  {p.medicine
                                    ? <Link to={`/medicine/${p.medicine._id}`}>{p.medicineName || p.medicine.name}</Link>
                                    : <strong>{p.medicineName || '—'}</strong>}
                                  {p.medicine?.expiryStatus === 'expired'    && <span className="badge badge-red ml-1">Expired</span>}
                                  {p.medicine?.expiryStatus === 'near_expiry'&& <span className="badge badge-yellow ml-1">Near Expiry</span>}
                                </div>
                                <div className="presc-details">
                                  {p.dosage    && <span>{p.dosage}</span>}
                                  {p.frequency && <span>{p.frequency}</span>}
                                  {p.duration  && <span>{p.duration}</span>}
                                </div>
                                {p.instructions && (
                                  <p className="presc-instructions">📋 {p.instructions}</p>
                                )}
                                <span className={`badge badge-${p.status==='active'?'green':p.status==='completed'?'blue':'red'}`}>
                                  {p.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Visit history */}
                      {tx.visits?.length > 0 && (
                        <div className="tx-visits">
                          <h4>📅 Visit History</h4>
                          {tx.visits.map((v, i) => (
                            <div key={i} className="visit-item">
                              <span className="visit-date">
                                {v.date ? new Date(v.date).toLocaleDateString('en-IN') : 'Date unknown'}
                              </span>
                              {v.notes && <span className="visit-notes">{v.notes}</span>}
                              {v.vitals && Object.values(v.vitals).some(Boolean) && (
                                <div className="visit-vitals">
                                  {v.vitals.bp     && <span>BP: {v.vitals.bp}</span>}
                                  {v.vitals.pulse  && <span>Pulse: {v.vitals.pulse}</span>}
                                  {v.vitals.weight && <span>Weight: {v.vitals.weight}kg</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
