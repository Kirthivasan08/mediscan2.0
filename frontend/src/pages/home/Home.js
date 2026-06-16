import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Home.css';

const FEATURES = [
  { icon:'📱', title:'QR Code Scanning',       desc:'Scan any medicine QR code or barcode using your device camera for instant drug information.' },
  { icon:'💊', title:'Medicine Database',        desc:'Access a comprehensive pharmaceutical database with drug name, brand, composition, dosage, and expiry date.' },
  { icon:'⚠️', title:'Expiry Alert System',      desc:'Instantly see if a medicine is expired, near expiry, or safe to use with color-coded status indicators.' },
  { icon:'🧑‍⚕️', title:'Patient Records',         desc:'Healthcare professionals can scan patient QR cards to instantly access complete treatment history.' },
  { icon:'🔗', title:'Drug Interactions',        desc:'View known drug interactions and contraindications to prevent adverse reactions.' },
  { icon:'🔐', title:'OAuth Security',           desc:'Secure login via Google or GitHub. Role-based access for patients, doctors, pharmacists, and admins.' },
];

// Performance metrics from the research paper (Table I)
const METRICS = [
  { value:'1.2s',  label:'Avg QR Scan Time' },
  { value:'0.8s',  label:'DB Retrieval Time' },
  { value:'2.0s',  label:'Total Display Time' },
  { value:'99.2%', label:'Data Accuracy' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="live-dot"/>
            QR-Based Intelligent Medicine Information System
          </div>
          <h1 className="hero-title">
            Scan any medicine.<br/>
            <span className="hero-hl">Know everything.</span>
          </h1>
          <p className="hero-desc">
            MediScan provides instant access to complete pharmaceutical data — drug name, brand, composition,
            dosage, side effects, expiry date, and drug interactions — through a simple QR code scan.
            Built for patients, pharmacists, doctors, and healthcare professionals.
          </p>
          <div className="hero-actions">
            <Link to="/scan" className="btn btn-primary btn-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9V6a3 3 0 013-3h3M15 3h3a3 3 0 013 3v3M3 15v3a3 3 0 003 3h3m6 0h3a3 3 0 003-3v-3M3 12h18"/></svg>
              Start Scanning
            </Link>
            <Link to="/medicines" className="btn btn-secondary btn-lg">Browse Medicines</Link>
          </div>

          {/* Performance metrics — from research paper Table I */}
          <div className="metrics-bar">
            {METRICS.map(m => (
              <div key={m.label} className="metric-item">
                <span className="metric-val">{m.value}</span>
                <span className="metric-label">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual — MedScan UI mockup */}
        <div className="hero-visual">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div className="phone-header">
                <div className="phone-logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                </div>
                <span>MEDSCAN</span>
              </div>
              <div className="phone-body">
                <div className="phone-scan-area">
                  <div className="scan-corner tl"/><div className="scan-corner tr"/>
                  <div className="scan-corner bl"/><div className="scan-corner br"/>
                  <div className="phone-scan-line"/>
                  <div className="phone-qr-grid">
                    {Array.from({length:25}).map((_,i)=><div key={i} className={`pqc ${(i%3===0||i%7===0)?'f':''}`}/>)}
                  </div>
                </div>
                <p className="phone-hint">Scan QR code</p>
                <div className="phone-result">
                  <div className="pr-found">✅ Medicine Found</div>
                  <strong>Paracetamol 500mg</strong>
                  <small>Crocin, Dolo-650, Calpol</small>
                  <div className="pr-row"><span className="badge badge-green">✓ Valid</span><span className="badge badge-blue">analgesic</span></div>
                  <div className="pr-row text-sm text-muted"><span>Exp: Dec 2025</span><span>₹15</span></div>
                </div>
              </div>
              <div className="phone-footer">
                <span>Scan QR</span>
                <span>Scan Barcode</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-heading">
          <h2>Everything you need for safe medication management</h2>
          <p>A complete digital pharmaceutical intelligence platform</p>
        </div>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card card card-hover">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture summary from the research paper */}
      <section className="arch-section">
        <div className="section-heading">
          <h2>System Workflow</h2>
          <p>From scan to information in under 2 seconds</p>
        </div>
        <div className="arch-steps">
          {[
            { step:'01', label:'Mobile Scanner',    desc:'Camera captures QR code', icon:'📸' },
            { step:'02', label:'QR Decoder',        desc:'Extracts medicine/patient ID', icon:'🔍' },
            { step:'03', label:'Validation',        desc:'Verifies against database', icon:'✅' },
            { step:'04', label:'Data Retrieval',    desc:'Fetches complete drug info', icon:'🗄️' },
            { step:'05', label:'Display Result',    desc:'Shows report or Invalid screen', icon:'📋' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.step}>
              <div className="arch-step">
                <div className="arch-step-num">{s.icon}</div>
                <div className="arch-step-info">
                  <p className="arch-step-label">{s.label}</p>
                  <p className="arch-step-desc">{s.desc}</p>
                </div>
              </div>
              {i < arr.length - 1 && <div className="arch-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="cta-section">
          <div className="cta-card">
            <h2>Ready to scan smarter?</h2>
            <p>Join MediScan — the intelligent medicine information system built for the future of healthcare.</p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
              <Link to="/login"    className="btn btn-secondary btn-lg">Sign In</Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <strong>MediScan</strong>
            <p>QR-Based Intelligent Medicine Information System</p>
            <p className="text-faint text-xs">Project by Narmath T </p>
          </div>
          <div className="footer-links">
            <Link to="/medicines">Medicines</Link>
            <Link to="/scan">Scanner</Link>
            {user && <Link to="/dashboard">Dashboard</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
}
