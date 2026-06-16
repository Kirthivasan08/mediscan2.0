import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import './Medicines.css';

const CATS = ['all','analgesic','antibiotic','antiviral','cardiovascular','diabetes','respiratory','gastrointestinal','neurological','vitamin','supplement','dermatology','other'];

const CAT_ICON = { analgesic:'💊', antibiotic:'🦠', antiviral:'🔬', cardiovascular:'❤️', diabetes:'🩸', respiratory:'🫁', gastrointestinal:'🫀', neurological:'🧠', vitamin:'⚡', supplement:'🌿', dermatology:'🧴', other:'💉' };

function MedCard({ m }) {
  const exp = m.expiryStatus;
  return (
    <Link to={`/medicine/${m._id}`} className="med-card card card-hover">
      <div className="med-card-top">
        <div className="med-cat-icon">{CAT_ICON[m.category]||'💉'}</div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'flex-end'}}>
          {exp === 'expired'    && <span className="badge badge-red">Expired</span>}
          {exp === 'near_expiry'&& <span className="badge badge-yellow">Near Expiry</span>}
          {m.prescriptionRequired && <span className="badge badge-purple">Rx</span>}
        </div>
      </div>
      <h3 className="med-card-name">{m.name}</h3>
      {m.genericName && <p className="med-card-generic">{m.genericName}</p>}
      {m.brand && <p className="med-card-brand">{m.brand}</p>}
      <div className="med-card-footer">
        <span className="badge badge-blue">{m.category}</span>
        {m.dosageForm && <span className="badge badge-gray">{m.dosageForm}</span>}
        {m.strength   && <span className="med-strength">{m.strength}</span>}
      </div>
      {m.expiryDate && (
        <p className={`med-expiry ${exp==='expired'?'text-danger':exp==='near_expiry'?'text-warning':''}`}>
          Exp: {new Date(m.expiryDate).toLocaleDateString()}
        </p>
      )}
    </Link>
  );
}

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category,  setCategory]  = useState('all');
  const [page,      setPage]      = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, category });
      if (search) params.append('search', search);
      const { data } = await API.get(`/medicines?${params}`);
      setMedicines(data.medicines);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, category, search]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
  const clearFilters = () => { setSearch(''); setSearchInput(''); setCategory('all'); setPage(1); };

  return (
    <div className="page">
      <div className="meds-header animate-in">
        <div>
          <h1 className="section-title">Medicine Database</h1>
          <p className="section-sub">{pagination.total||0} medicines in the pharmaceutical database</p>
        </div>
        <Link to="/scan" className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9V6a3 3 0 013-3h3M15 3h3a3 3 0 013 3v3M3 15v3a3 3 0 003 3h3m6 0h3a3 3 0 003-3v-3M3 12h18"/></svg>
          Scan QR
        </Link>
      </div>

      {/* Search bar */}
      <form className="search-bar animate-in" onSubmit={handleSearch}>
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" className="form-input" placeholder="Search by name, brand, manufacturer…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
        {(search||category!=='all') && <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear</button>}
      </form>

      {/* Category filter */}
      <div className="cat-filters animate-in">
        {CATS.map(c => (
          <button key={c} className={`cat-pill ${category===c?'active':''}`} onClick={() => { setCategory(c); setPage(1); }}>
            {CAT_ICON[c] && <span>{CAT_ICON[c]}</span>}
            {c==='all'?'All':c.charAt(0).toUpperCase()+c.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="med-grid">
          {Array.from({length:8}).map((_,i) => <div key={i} className="med-skeleton"/>)}
        </div>
      ) : medicines.length === 0 ? (
        <div className="empty-state" style={{padding:'80px 0'}}>
          <span style={{fontSize:48}}>🔍</span>
          <p>No medicines found. Try adjusting filters.</p>
          <button className="btn btn-ghost" onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="med-grid animate-in">
          {medicines.map(m => <MedCard key={m._id} m={m} />)}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination animate-in">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Prev</button>
          <span className="text-muted text-sm">Page {page} of {pagination.pages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.pages,p+1))} disabled={page===pagination.pages}>Next →</button>
        </div>
      )}
    </div>
  );
}
