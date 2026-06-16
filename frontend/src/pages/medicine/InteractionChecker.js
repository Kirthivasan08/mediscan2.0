import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import toast from 'react-hot-toast';
import './InteractionChecker.css';

const RISK_CONFIG = {
  SAFE:     { color: 'var(--accent)',   bg: 'var(--accent-light)',   icon: '✓', label: 'SAFE' },
  LOW:      { color: '#0077cc',         bg: '#e6f2ff',               icon: 'ℹ', label: 'LOW RISK' },
  MODERATE: { color: 'var(--warning)',  bg: 'var(--warning-light)',  icon: '⚠', label: 'MODERATE RISK' },
  HIGH:     { color: 'var(--danger)',   bg: 'var(--danger-light)',   icon: '🚨', label: 'HIGH RISK' },
};

export default function InteractionChecker() {
  const { t } = useLang();
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState([]);
  const [selected,  setSelected]  = useState([]);
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  // Search medicines as user types
  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await API.get(`/medicines?search=${encodeURIComponent(search)}&limit=8`);
        setResults(data.medicines.filter(m => !selected.find(s => s._id === m._id)));
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selected]);

  const addMedicine = (m) => {
    if (selected.length >= 8) return toast.error('Maximum 8 medicines');
    setSelected(prev => [...prev, m]);
    setSearch('');
    setResults([]);
    setReport(null);
  };

  const removeMedicine = (id) => {
    setSelected(prev => prev.filter(m => m._id !== id));
    setReport(null);
  };

  const checkInteractions = async () => {
    if (selected.length < 2) return toast.error('Select at least 2 medicines');
    setLoading(true);
    try {
      const { data } = await API.post('/interactions/check', { medicineIds: selected.map(m => m._id) });
      setReport(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check failed');
    } finally { setLoading(false); }
  };

  const risk = report ? RISK_CONFIG[report.riskLevel] || RISK_CONFIG.SAFE : null;

  return (
    <div className="page page-md">
      <div className="inter-header animate-in">
        <div>
          <h1 className="section-title">
            <span style={{fontSize:26}}>💊</span> {t('inter_title')}
          </h1>
          <p className="section-sub">{t('inter_sub')}</p>
        </div>
      </div>

      {/* Selected medicines */}
      <div className="card animate-in" style={{marginBottom:16}}>
        <h3 style={{fontWeight:700, marginBottom:14}}>{t('inter_select')}</h3>

        {/* Search input */}
        <div className="inter-search-wrap" ref={searchRef}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inter-search-icon">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text" className="form-input" style={{paddingLeft:40}}
            placeholder={t('inter_search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {searching && <div className="spinner" style={{width:16,height:16,borderWidth:2,position:'absolute',right:14,top:'50%',transform:'translateY(-50%)'}}/>}
          {results.length > 0 && (
            <div className="inter-dropdown">
              {results.map(m => (
                <button key={m._id} className="inter-dropdown-item" onClick={() => addMedicine(m)}>
                  <div>
                    <p className="inter-drug-name">{m.name}</p>
                    <p className="inter-drug-sub text-sm text-muted">{m.brand || m.genericName || '—'} · {m.category}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16,color:'var(--primary)'}}>
                    <path d="M12 4v16m8-8H4"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected pills */}
        {selected.length > 0 && (
          <div className="selected-meds">
            {selected.map(m => (
              <div key={m._id} className="selected-pill">
                <span>{m.name}</span>
                {m.strength && <span className="pill-strength">{m.strength}</span>}
                <button onClick={() => removeMedicine(m._id)}>×</button>
              </div>
            ))}
          </div>
        )}

        {selected.length < 2 && (
          <p className="text-faint text-sm" style={{marginTop:10}}>Add at least 2 medicines to check interactions.</p>
        )}

        <button
          className="btn btn-primary btn-lg"
          style={{marginTop:16}}
          onClick={checkInteractions}
          disabled={loading || selected.length < 2}
        >
          {loading
            ? <><div className="spinner" style={{width:18,height:18,borderWidth:2}}/> Checking…</>
            : `🔍 ${t('inter_check')}`}
        </button>
      </div>

      {/* Report */}
      {report && (
        <div className="inter-report animate-in">
          {/* Risk banner */}
          <div className="risk-banner" style={{ background: risk.bg, borderColor: risk.color }}>
            <div className="risk-icon" style={{color: risk.color}}>{risk.icon}</div>
            <div>
              <h2 style={{color: risk.color}}>{risk.label}</h2>
              <p>{report.summary}</p>
            </div>
            <div className="risk-score" style={{color: risk.color}}>
              Score: {report.severityScore}
            </div>
          </div>

          {/* Expired medicines warning */}
          {report.expiredMedicines?.length > 0 && (
            <div className="warn-block" style={{marginBottom:12}}>
              <h4>⚠ Expired Medicines Detected</h4>
              {report.expiredMedicines.map((m,i) => (
                <p key={i} className="text-danger text-sm">• {m.name} expired {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : ''}</p>
              ))}
            </div>
          )}

          {/* Interactions list */}
          {report.interactions?.length > 0 ? (
            <div className="inter-results-section">
              <h3>{report.interactions.length} {t('inter_found')}</h3>
              {report.interactions.map((inter, i) => (
                <div key={i} className={`inter-item sev-${inter.severity}`}>
                  <div className="inter-item-header">
                    <div className="inter-drugs">
                      <Link to={`/medicines?search=${encodeURIComponent(inter.drugA)}`} className="drug-chip">{inter.drugA}</Link>
                      <span className="inter-plus">⟷</span>
                      <Link to={`/medicines?search=${encodeURIComponent(inter.drugB)}`} className="drug-chip">{inter.drugB}</Link>
                    </div>
                    <span className={`badge badge-${inter.severity === 'severe' ? 'red' : inter.severity === 'moderate' ? 'yellow' : 'blue'}`}>
                      {inter.severity}
                    </span>
                  </div>
                  {inter.description && <p className="inter-desc">{inter.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-inter-msg">
              <span style={{fontSize:40}}>✅</span>
              <p>{t('inter_none')}</p>
            </div>
          )}

          {/* Warnings */}
          {report.warnings?.length > 0 && (
            <div className="inter-results-section">
              <h3>⚠ Warnings</h3>
              {report.warnings.map((w, i) => (
                <div key={i} className="warn-row">
                  <p>{w.message}</p>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-ghost" style={{marginTop:8}} onClick={() => { setReport(null); setSelected([]); }}>
            Clear & Start Over
          </button>
        </div>
      )}
    </div>
  );
}
