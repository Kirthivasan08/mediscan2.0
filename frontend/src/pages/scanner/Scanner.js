import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAuth, API } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import toast from 'react-hot-toast';
import './Scanner.css';

const SCAN_TABS = [
  { key:'camera', label:'Camera Scan', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> },
  { key:'barcode', label:'Barcode', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14"/></svg> },
  { key:'manual', label:'Enter Code', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
];

export default function Scanner() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [tab,       setTab]       = useState('camera');
  const [scanning,  setScanning]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [manualVal, setManualVal] = useState('');
  const scannerRef = useRef(null);
  const html5Ref   = useRef(null);

  // Stop scanner helper
  const stopScanner = () => {
    if (html5Ref.current) {
      html5Ref.current.clear().catch(() => {});
      html5Ref.current = null;
    }
    setScanning(false);
  };

  // Call API when raw QR data obtained
  const processRawData = async (rawData, scanType) => {
    if (loading) return;
    setLoading(true);
    stopScanner();
    try {
      const { data } = await API.post('/medicines/scan', { rawData, scanType });
      setResult(data);
      if (data.found) toast.success(data.resultType === 'patient' ? 'Patient record found!' : 'Medicine found!');
      else toast.error('Code not found in database — Invalid QR');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan failed');
    } finally { setLoading(false); }
  };

  // Start Html5 scanner
  useEffect(() => {
    if (!scanning) return;
    const isBarcodeMode = tab === 'barcode';

    const scanner = new Html5QrcodeScanner(
      'qr-reader-container',
      {
        fps: 15,
        qrbox: isBarcodeMode ? { width: 300, height: 100 } : { width: 250, height: 250 },
        formatsToSupport: isBarcodeMode
          ? [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_39]
          : [Html5QrcodeSupportedFormats.QR_CODE],
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      (decoded) => processRawData(decoded, isBarcodeMode ? 'barcode' : 'qr'),
      () => {} // suppress per-frame errors
    );

    html5Ref.current = scanner;
    return () => { scanner.clear().catch(() => {}); };
    // eslint-disable-next-line
  }, [scanning, tab]);

  const switchTab = (t) => { stopScanner(); setTab(t); setResult(null); setManualVal(''); };
  const reset     = () => { setResult(null); setManualVal(''); };

  const handleManual = (e) => {
    e.preventDefault();
    if (!manualVal.trim()) return toast.error('Please enter a code');
    processRawData(manualVal.trim(), 'manual');
  };

  if (!user) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div className="auth-prompt card text-center">
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <h2 style={{marginBottom:8}}>Login Required</h2>
        <p className="text-muted mb-4">You need to be logged in to scan medicines and save history.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <Link to="/login" className="btn btn-primary">Login</Link>
          <Link to="/register" className="btn btn-secondary">Register</Link>
        </div>
      </div>
    </div>
  );

  const getSeverityColor = (s) => s==='severe'?'var(--danger)':s==='moderate'?'var(--warning)':'var(--accent)';

  return (
    <div className="page page-md">
      <div className="scanner-header animate-in">
        <h1 className="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:28,height:28,color:'var(--primary)'}}>
            <path d="M3 9V6a3 3 0 013-3h3M15 3h3a3 3 0 013 3v3M3 15v3a3 3 0 003 3h3m6 0h3a3 3 0 003-3v-3M3 12h18"/>
          </svg>
          Medicine Scanner
        </h1>
        <p className="section-sub">Scan QR code or barcode to instantly retrieve medicine information</p>
      </div>

      {/* Tabs */}
      <div className="scan-tabs animate-in">
        {SCAN_TABS.map(t => (
          <button key={t.key} className={`scan-tab ${tab===t.key?'active':''}`} onClick={() => switchTab(t.key)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className={`scan-result-card animate-in ${result.found ? 'found' : 'not-found'}`}>
          {result.found ? (
            <>
              {/* Medicine result */}
              {result.resultType === 'medicine' && result.medicine && (
                <div className="med-result">
                  <div className="result-topbar">
                    <div className="result-status success">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Medicine Found
                    </div>
                    {result.medicine.qrCode && (
                      <img src={result.medicine.qrCode} alt="QR" className="result-qr-thumb" />
                    )}
                  </div>

                  <div className="med-result-name">
                    <h2>{result.medicine.name}</h2>
                    {result.medicine.genericName && <p>{result.medicine.genericName}</p>}
                  </div>

                  <div className="med-result-meta">
                    {result.medicine.brand && <span><b>Brand:</b> {result.medicine.brand}</span>}
                    {result.medicine.manufacturer && <span><b>Mfr:</b> {result.medicine.manufacturer}</span>}
                    {result.medicine.batchNumber && <span className="font-mono"><b>Batch:</b> {result.medicine.batchNumber}</span>}
                    {result.medicine.strength && <span><b>Strength:</b> {result.medicine.strength}</span>}
                  </div>

                  <div className="med-result-badges">
                    <span className={`badge badge-${result.medicine.expiryStatus==='expired'?'red':result.medicine.expiryStatus==='near_expiry'?'yellow':'green'}`}>
                      {result.medicine.expiryStatus==='expired'?'⚠ Expired':result.medicine.expiryStatus==='near_expiry'?'⚠ Near Expiry':'✓ Valid'}
                    </span>
                    <span className="badge badge-blue">{result.medicine.category}</span>
                    {result.medicine.prescriptionRequired && <span className="badge badge-yellow">Rx Required</span>}
                    {result.medicine.dosageForm && <span className="badge badge-purple">{result.medicine.dosageForm}</span>}
                  </div>

                  <div className="med-info-grid">
                    {result.medicine.dosageInstructions?.frequency && (
                      <div className="med-info-box">
                        <h4>Usage</h4>
                        <p>{result.medicine.dosageInstructions.frequency}</p>
                        {result.medicine.dosageInstructions.consumption && <small>{result.medicine.dosageInstructions.consumption}</small>}
                      </div>
                    )}
                    {result.medicine.expiryDate && (
                      <div className={`med-info-box ${result.medicine.expiryStatus==='expired'?'danger':''}`}>
                        <h4>Expiry Date</h4>
                        <p className={result.medicine.expiryStatus==='expired'?'text-danger':'text-success'}>
                          {new Date(result.medicine.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {result.medicine.manufacturingDate && (
                      <div className="med-info-box">
                        <h4>Manufacturing Date</h4>
                        <p>{new Date(result.medicine.manufacturingDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {result.medicine.dosageInstructions?.adults && (
                      <div className="med-info-box">
                        <h4>Adult Dosage</h4>
                        <p>{result.medicine.dosageInstructions.adults}</p>
                      </div>
                    )}
                  </div>

                  {result.medicine.warnings?.length > 0 && (
                    <div className="warn-box">
                      <h4>⚠ Warnings</h4>
                      <ul>{result.medicine.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
                    </div>
                  )}

                  {result.medicine.sideEffects?.length > 0 && (
                    <div className="se-list">
                      <h4>Side Effects</h4>
                      {result.medicine.sideEffects.map((se,i)=>(
                        <div key={i} className="se-item" style={{borderLeftColor: getSeverityColor(se.severity)}}>
                          <span className="se-sev" style={{color: getSeverityColor(se.severity)}}>{se.severity}</span>
                          <span>{se.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.metrics && (
                    <div className="perf-row">
                      <span>⚡ Retrieved in {result.metrics.totalTimeMs}ms</span>
                    </div>
                  )}

                  <div className="result-actions">
                    <Link to={`/medicine/${result.medicine._id}`} className="btn btn-primary">View Full Details</Link>
                    <button className="btn btn-secondary" onClick={reset}>Scan Another</button>
                  </div>
                </div>
              )}

              {/* Patient result */}
              {result.resultType === 'patient' && result.patient && (
                <div className="patient-result">
                  <div className="result-status success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    Patient Record Found
                  </div>
                  <div className="patient-card-inner">
                    <div className="p-avatar">{result.patient.name?.[0]}</div>
                    <div>
                      <h2>{result.patient.name}</h2>
                      <p className="text-muted">{result.patient.patientId} · {result.patient.bloodGroup||'—'}</p>
                      {result.patient.allergies?.length > 0 && (
                        <p className="text-danger text-sm" style={{marginTop:4}}>
                          ⚠ <strong>Allergies:</strong> {result.patient.allergies.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ongoing treatments + medicines shown to pharmacist/doctor */}
                  {result.treatments?.length > 0 && (
                    <div className="scan-treatments">
                      <h4 style={{margin:'14px 0 10px'}}>Current Treatments &amp; Active Medicines</h4>
                      {result.treatments.map((tx, ti) => (
                        <div key={ti} className="scan-treatment-row">
                          <div className="scan-tx-disease">
                            <span className="badge badge-blue">{tx.disease}</span>
                            {tx.doctorName && <span className="text-muted text-sm" style={{marginLeft:6}}>Dr. {tx.doctorName}</span>}
                          </div>
                          {tx.prescriptions?.filter(p=>p.status==='active').length > 0 && (
                            <div className="scan-presc-list">
                              {tx.prescriptions.filter(p=>p.status==='active').map((p, pi) => (
                                <div key={pi} className="scan-presc-item">
                                  <span className="scan-med-name">{p.medicineName || p.medicine?.name || '—'}</span>
                                  {p.dosage    && <span className="text-muted">{p.dosage}</span>}
                                  {p.frequency && <span className="text-muted">{p.frequency}</span>}
                                  {p.medicine?.expiryStatus === 'expired'     && <span className="badge badge-red">EXPIRED</span>}
                                  {p.medicine?.expiryStatus === 'near_expiry' && <span className="badge badge-yellow">Near Expiry</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="result-actions">
                    <Link to={`/patient/${result.patient._id}`} className="btn btn-primary">Full Medical History</Link>
                    <button className="btn btn-secondary" onClick={reset}>Scan Another</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Invalid screen — matches Figure 6 from the project report
            <div className="invalid-screen">
              <div className="result-status danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                Invalid Code
              </div>
              <div className="invalid-icon">❌</div>
              <h3>Code not recognized</h3>
              <p className="text-muted">The scanned QR / barcode does not match any record in the database. Try another code.</p>
              <div className="result-actions">
                <button className="btn btn-primary" onClick={reset}>Scan Another</button>
                <Link to="/medicines" className="btn btn-secondary">Browse Medicines</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanner UI */}
      {!result && (
        <div className="scan-area card animate-in">
          {/* Camera / QR tab */}
          {(tab === 'camera' || tab === 'barcode') && (
            <div className="camera-section">
              {!scanning ? (
                <div className="scan-idle">
                  <div className="scan-idle-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9V6a3 3 0 013-3h3M15 3h3a3 3 0 013 3v3M3 15v3a3 3 0 003 3h3m6 0h3a3 3 0 003-3v-3M3 12h18"/>
                    </svg>
                  </div>
                  <h3>{tab === 'barcode' ? 'Scan Barcode' : 'Scan QR Code'}</h3>
                  <p className="text-muted">
                    {tab === 'barcode'
                      ? 'Point camera at the barcode printed on the medicine packaging'
                      : 'Point camera at the QR code on the medicine strip or patient card'}
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={() => setScanning(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Open Camera
                  </button>
                </div>
              ) : (
                <div className="camera-live">
                  {loading && (
                    <div className="scan-overlay">
                      <div className="spinner" style={{width:48,height:48}}/>
                      <p>Processing scan…</p>
                    </div>
                  )}
                  <div id="qr-reader-container" ref={scannerRef} />
                  <button className="btn btn-secondary mt-4" onClick={stopScanner}>✕ Stop Scanner</button>
                </div>
              )}
            </div>
          )}

          {/* Manual entry tab */}
          {tab === 'manual' && (
            <div className="manual-section">
              <div className="scan-idle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h3>Manual Entry</h3>
              <p className="text-muted">Enter Medicine ID, Barcode, Batch Number, or Patient ID</p>
              <form onSubmit={handleManual} className="manual-form">
                <input
                  type="text" className="form-input"
                  placeholder="e.g. MED00001 or PAT00001 or Batch Number…"
                  value={manualVal}
                  onChange={e => setManualVal(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}}/> Searching…</> : 'Search'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
