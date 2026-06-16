import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { API, useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './TreatmentForm.css';

const TYPES      = ['chronic','surgery','infection','injury','other'];
const SEVERITIES = ['mild','moderate','severe'];
const STATUSES   = ['ongoing','recovered','stopped','follow_up'];
const P_STATUSES = ['active','completed','stopped'];

function useQuery() { return new URLSearchParams(useLocation().search); }

const emptyRx = () => ({
  medicine:'', medicineName:'', dosage:'', frequency:'', duration:'', instructions:'', status:'active',
});

export default function TreatmentForm() {
  const { user }   = useAuth();
  const { id }     = useParams();
  const q          = useQuery();
  const patientId  = q.get('patient');
  const navigate   = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allMeds,    setAllMeds]    = useState([]);
  const [dropIdx,    setDropIdx]    = useState(null);   // which rx row has open dropdown
  const [searchMap,  setSearchMap]  = useState({});
  const dropRef = useRef(null);

  const [form, setForm] = useState({
    patient:'', disease:'', type:'other', severity:'mild', status:'ongoing',
    hospital: user?.hospital || '', startDate: new Date().toISOString().slice(0,10),
    endDate:'', notes:'', prescriptions:[],
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropIdx(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load medicine list once
  useEffect(() => {
    API.get('/medicines?limit=200')
      .then(r => setAllMeds(r.data.medicines || []))
      .catch(() => {});
  }, []);

  // Load existing treatment for edit
  useEffect(() => {
    if (!patientId && !id) {
      toast.error('Patient ID required.');
      navigate('/dashboard');
      return;
    }
    if (id) {
      API.get(`/treatments/${id}`)
        .then(r => {
          const t = r.data.treatment;
          setForm({
            patient:  t.patient?._id  || t.patient  || '',
            disease:  t.disease       || '',
            type:     t.type          || 'other',
            severity: t.severity      || 'mild',
            status:   t.status        || 'ongoing',
            hospital: t.hospital      || '',
            startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
            endDate:  t.endDate   ? new Date(t.endDate).toISOString().slice(0,10) : '',
            notes:    t.notes         || '',
            prescriptions: (t.prescriptions || []).map(p => ({
              medicine:     p.medicine?._id || p.medicine || '',
              medicineName: p.medicineName  || p.medicine?.name || '',
              dosage:       p.dosage        || '',
              frequency:    p.frequency     || '',
              duration:     p.duration      || '',
              instructions: p.instructions  || '',
              status:       p.status        || 'active',
            })),
          });
        })
        .catch(e => toast.error(e.response?.data?.message || 'Failed to load.'))
        .finally(() => setLoading(false));
    } else {
      setForm(f => ({ ...f, patient: patientId || '' }));
      setLoading(false);
    }
  }, [id, patientId, navigate]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const addRx    = () => setForm(f => ({ ...f, prescriptions: [...f.prescriptions, emptyRx()] }));
  const removeRx = (i) => setForm(f => ({ ...f, prescriptions: f.prescriptions.filter((_,idx)=>idx!==i) }));
  const setRx    = (i, field, val) =>
    setForm(f => ({ ...f, prescriptions: f.prescriptions.map((p,idx)=> idx===i ? {...p,[field]:val} : p) }));

  const pickMedicine = (i, med) => {
    setRx(i, 'medicine',     med._id);
    setRx(i, 'medicineName', `${med.name}${med.strength ? ' ' + med.strength : ''}`);
    setSearchMap(m => ({ ...m, [i]: '' }));
    setDropIdx(null);
  };

  const filtered = (i) => {
    const q2 = (searchMap[i] || '').toLowerCase().trim();
    if (!q2 || q2.length < 2) return [];
    return allMeds
      .filter(m => m.name.toLowerCase().includes(q2) || (m.brand||'').toLowerCase().includes(q2) || (m.genericName||'').toLowerCase().includes(q2))
      .slice(0, 8);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient)       return toast.error('Patient ID required.');
    if (!form.disease.trim())return toast.error('Diagnosis is required.');

    // Validate prescriptions have a name
    const badRx = form.prescriptions.findIndex(p => !p.medicineName.trim());
    if (badRx !== -1) return toast.error(`Medicine ${badRx+1}: name is required.`);

    setSubmitting(true);
    try {
      if (id) {
        await API.put(`/treatments/${id}`, form);
        toast.success('Treatment updated.');
      } else {
        await API.post('/treatments', form);
        toast.success('Treatment saved. Patient notified by email.');
      }
      navigate(`/patient/${form.patient}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/><p>Loading…</p></div>;

  return (
    <div className="page">
      <div className="treatment-form-header animate-in">
        <h2>{id ? 'Edit Treatment' : 'Add Treatment & Prescription'}</h2>
        <p>{id ? 'Update the diagnosis and medicines.' : 'Record diagnosis and prescribe medicines for this patient.'}</p>
      </div>

      <form className="treatment-form-card animate-in" onSubmit={handleSubmit}>

        {/* ─── Section 1: Diagnosis ─────────────────────────────── */}
        <div className="tf-section-label">Diagnosis</div>
        <div className="tf-grid-2">
          <div className="form-group">
            <label>Disease / Diagnosis *</label>
            <input type="text" value={form.disease} onChange={e=>set('disease',e.target.value)}
              placeholder="e.g. Type 2 Diabetes, Hypertension" required />
          </div>
          <div className="form-group">
            <label>Hospital / Clinic</label>
            <input type="text" value={form.hospital} onChange={e=>set('hospital',e.target.value)}
              placeholder="e.g. City Hospital" />
          </div>
        </div>
        <div className="tf-grid-3">
          <div className="form-group">
            <label>Type</label>
            <select value={form.type} onChange={e=>set('type',e.target.value)}>
              {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select value={form.severity} onChange={e=>set('severity',e.target.value)}>
              {SEVERITIES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)}>
              {STATUSES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="tf-grid-2">
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" value={form.startDate} onChange={e=>set('startDate',e.target.value)} required />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" value={form.endDate} onChange={e=>set('endDate',e.target.value)}
              min={form.startDate} />
          </div>
        </div>
        <div className="form-group">
          <label>Doctor's Notes</label>
          <textarea rows="3" value={form.notes} onChange={e=>set('notes',e.target.value)}
            placeholder="Clinical notes, observations, treatment plan..." />
        </div>

        {/* ─── Section 2: Prescriptions ─────────────────────────── */}
        <div className="tf-section-label" style={{marginTop:28}}>
          Prescription
          <span className="tf-count-badge">{form.prescriptions.length} medicine{form.prescriptions.length!==1?'s':''}</span>
        </div>

        {form.prescriptions.length === 0 && (
          <div className="tf-empty-rx">No medicines added. Click "Add Medicine" to prescribe.</div>
        )}

        <div ref={dropRef}>
          {form.prescriptions.map((rx, i) => (
            <div key={i} className="rx-card">
              <div className="rx-card-header">
                <span className="rx-num">💊 Medicine {i+1}</span>
                <button type="button" className="rx-remove" onClick={()=>removeRx(i)}>✕ Remove</button>
              </div>

              {/* Medicine search */}
              <div className="form-group" style={{position:'relative'}}>
                <label>Search from medicine database</label>
                <input
                  type="text"
                  placeholder="Type name, brand or generic name..."
                  value={searchMap[i] || ''}
                  onChange={e => { setSearchMap(m=>({...m,[i]:e.target.value})); setDropIdx(i); }}
                  onFocus={() => setDropIdx(i)}
                  autoComplete="off"
                />
                {dropIdx === i && filtered(i).length > 0 && (
                  <div className="med-drop">
                    {filtered(i).map(med => (
                      <div key={med._id} className="med-drop-item" onMouseDown={() => pickMedicine(i, med)}>
                        <div className="med-drop-main">
                          <span className="med-drop-name">{med.name}</span>
                          {med.strength && <span className="med-drop-strength">{med.strength}</span>}
                          {med.brand    && <span className="med-drop-brand">{med.brand}</span>}
                        </div>
                        <span className={`med-drop-exp ${med.expiryStatus}`}>
                          {med.expiryStatus === 'expired' ? 'EXPIRED' : med.expiryStatus === 'near_expiry' ? 'Near Expiry' : 'Valid'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="tf-grid-2">
                <div className="form-group">
                  <label>Medicine Name *</label>
                  <input type="text" value={rx.medicineName}
                    onChange={e=>setRx(i,'medicineName',e.target.value)}
                    placeholder="e.g. Metformin 500mg" required />
                  {rx.medicine && <small className="tf-linked">✓ Linked to database</small>}
                </div>
                <div className="form-group">
                  <label>Dosage</label>
                  <input type="text" value={rx.dosage}
                    onChange={e=>setRx(i,'dosage',e.target.value)}
                    placeholder="e.g. 500mg, 1 tablet" />
                </div>
              </div>

              <div className="tf-grid-3">
                <div className="form-group">
                  <label>Frequency</label>
                  <input type="text" value={rx.frequency}
                    onChange={e=>setRx(i,'frequency',e.target.value)}
                    placeholder="e.g. Twice daily with meals" />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input type="text" value={rx.duration}
                    onChange={e=>setRx(i,'duration',e.target.value)}
                    placeholder="e.g. 30 days, 3 months" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={rx.status} onChange={e=>setRx(i,'status',e.target.value)}>
                    {P_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Special Instructions</label>
                <input type="text" value={rx.instructions}
                  onChange={e=>setRx(i,'instructions',e.target.value)}
                  placeholder="e.g. Take with food, avoid alcohol, store below 25°C" />
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="btn-add-rx" onClick={addRx}>
          + Add Medicine
        </button>

        {/* ─── Actions ──────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={()=>navigate(-1)} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? 'Saving...'
              : id
                ? 'Update Treatment'
                : `Save Treatment${form.prescriptions.length > 0 ? ` + ${form.prescriptions.length} Medicine${form.prescriptions.length>1?'s':''}` : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
