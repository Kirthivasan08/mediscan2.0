import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout }  = useAuth();
  const { lang, toggleLang, t } = useLang();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open,  setOpen]  = useState(false);
  const [menu,  setMenu]  = useState(false);
  const dropRef = useRef(null);

  const isActive = (p) => location.pathname.startsWith(p);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setOpen(false); };

  const roleColor = { admin:'red', doctor:'purple', pharmacist:'green', patient:'blue' };
  const isAdmin = user?.role === 'admin' || user?.role === 'pharmacist';

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <div className="nav-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
          </div>
          <span>MediScan<span className="brand-highlight">Scan</span></span>
        </Link>

        <div className={`nav-links ${menu ? 'open' : ''}`}>
          <Link to="/medicines"   className={`nav-link ${isActive('/medicines')||isActive('/medicine')?'active':''}`} onClick={()=>setMenu(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            {t('nav_medicines')}
          </Link>
          <Link to="/scan"        className={`nav-link ${isActive('/scan')?'active':''}`} onClick={()=>setMenu(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9V6a3 3 0 013-3h3M15 3h3a3 3 0 013 3v3M3 15v3a3 3 0 003 3h3m6 0h3a3 3 0 003-3v-3M3 12h18"/></svg>
            {t('nav_scan')}
          </Link>
          <Link to="/interactions" className={`nav-link ${isActive('/interactions')?'active':''}`} onClick={()=>setMenu(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
            Interactions
          </Link>
          {user && (
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')?'active':''}`} onClick={()=>setMenu(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              {t('nav_dashboard')}
            </Link>
          )}
          {isAdmin && (
            <Link to="/add-medicine" className={`nav-link ${isActive('/add-medicine')||isActive('/edit-medicine')?'active':''}`} onClick={()=>setMenu(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4"/></svg>
              {t('nav_add')}
            </Link>
          )}
          {!user && (
  <>
    <Link
      to="/login"
      className="nav-link"
      onClick={() => setMenu(false)}
    >
      Login
    </Link>

    <Link
      to="/register"
      className="nav-link"
      onClick={() => setMenu(false)}
    >
      Register
    </Link>
  </>
)}
        </div>

        <div className="nav-right">
          {/* Language toggle — Tamil/English from PPT */}
          <button className="lang-toggle" onClick={toggleLang} title="Switch language">
            <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
            <span className="lang-sep">|</span>
            <span className={lang === 'ta' ? 'lang-active' : ''}>தமிழ்</span>
          </button>

          {user ? (
            <div className="dropdown" ref={dropRef}>
              <button className="avatar-btn" onClick={() => setOpen(!open)}>
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="avatar-img" />
                  : <div className="avatar-fallback">{user.name[0].toUpperCase()}</div>}
                <span className="avatar-name hide-mobile">{user.name.split(' ')[0]}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14,color:'var(--text-3)'}}><path d="M19 9l-7 7-7-7"/></svg>
              </button>
              {open && (
                <div className="dropdown-panel">
                  <div className="dropdown-header">
                    {user.avatar ? <img src={user.avatar} alt="" className="drop-avatar"/> : <div className="drop-avatar-fallback">{user.name[0]}</div>}
                    <div>
                      <p className="drop-name">{user.name}</p>
                      <p className="drop-email">{user.email}</p>
                      <span className={`badge badge-${roleColor[user?.role]||'blue'}`}>{user?.role}</span>
                    </div>
                  </div>
                  <Link to="/dashboard"   className="drop-item" onClick={()=>setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>{t('nav_dashboard')}</Link>
                  <Link to="/profile"     className="drop-item" onClick={()=>setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{t('nav_profile')}</Link>
                  <Link to="/scan-history" className="drop-item" onClick={()=>setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>{t('nav_history')}</Link>
                  {isAdmin && <Link to="/analytics" className="drop-item" onClick={()=>setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10m-6 10V4M6 20v-6"/></svg>Analytics</Link>}
                  {isAdmin && <Link to="/audit-log" className="drop-item" onClick={()=>setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><path d="M9 12h6M9 16h4"/></svg>Audit Log</Link>}
                  {isAdmin && <Link to="/bulk-import" className="drop-item" onClick={()=>setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Bulk Import</Link>}
                  <button className="drop-item danger" onClick={handleLogout}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>{t('nav_logout')}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth">  
              <Link to="/login"    className="btn btn-ghost btn-sm">{t('nav_login')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm">{t('nav_register')}</Link>
            </div>
          )}
          <button className="hamburger" onClick={() => setMenu(!menu)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menu ? <path d="M6 18L18 6M6 6l12 12"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
