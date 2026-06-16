import React, { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import './Analytics.css';

const BAR_COLORS = ['#0077cc','#0099ff','#00b894','#d69e2e','#6b46c1','#e53e3e','#38a169','#dd6b20'];

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mini-bar-track">
      <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function Analytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(30);

  useEffect(() => {
    setLoading(true);
    API.get(`/reports/analytics?days=${days}`)
      .then(res => setData(res.data.analytics))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/><p>Loading analytics…</p></div>;

  const maxScans    = data?.scansByDay ? Math.max(...data.scansByDay.map(d => d.total), 1) : 1;
  const maxTopMed   = data?.topMedicines ? Math.max(...data.topMedicines.map(m => m.count), 1) : 1;

  const totalScans   = data?.scansByDay?.reduce((s, d) => s + d.total, 0) || 0;
  const totalFound   = data?.scansByDay?.reduce((s, d) => s + d.found, 0) || 0;
  const efficiency   = totalScans > 0 ? ((totalFound / totalScans) * 100).toFixed(1) : '0.0';

  return (
    <div className="page">
      {/* Header */}
      <div className="analytics-header animate-in">
        <div>
          <h1 className="section-title">📊 Analytics Dashboard</h1>
          <p className="section-sub">System performance and usage statistics</p>
        </div>
        <div className="days-selector">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              className={`day-btn ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards — from research paper Table I */}
      <div className="kpi-grid animate-in">
        <div className="kpi-card">
          <div className="kpi-icon">📱</div>
          <div className="kpi-val">{totalScans.toLocaleString()}</div>
          <div className="kpi-label">Total Scans ({days}d)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">✅</div>
          <div className="kpi-val" style={{color:'var(--accent)'}}>{totalFound.toLocaleString()}</div>
          <div className="kpi-label">Successful Retrievals</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-val" style={{color:'var(--primary)'}}>{efficiency}%</div>
          <div className="kpi-label">Efficiency Rate</div>
          <div className="kpi-note">Successful / Total × 100</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">⚡</div>
          <div className="kpi-val" style={{color:'var(--purple)'}}>2.0s</div>
          <div className="kpi-label">Avg. Display Time</div>
          <div className="kpi-note">T<sub>scan</sub> + T<sub>decode</sub> + T<sub>query</sub></div>
        </div>
      </div>

      <div className="analytics-grid animate-in">
        {/* Scans per day bar chart */}
        <div className="card">
          <h3 className="chart-title">Scans Over Time</h3>
          {data?.scansByDay?.length > 0 ? (
            <div className="bar-chart">
              {data.scansByDay.map((d, i) => (
                <div key={i} className="bar-col" title={`${d._id}: ${d.total} scans`}>
                  <div className="bar-stack">
                    <div
                      className="bar-segment found"
                      style={{ height: `${Math.round((d.found / maxScans) * 140)}px` }}
                      title={`Found: ${d.found}`}
                    />
                    <div
                      className="bar-segment not-found"
                      style={{ height: `${Math.round(((d.total - d.found) / maxScans) * 140)}px` }}
                      title={`Not Found: ${d.total - d.found}`}
                    />
                  </div>
                  <span className="bar-label">{d._id?.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No scan data for this period</div>
          )}
          <div className="chart-legend">
            <span><span className="legend-dot found-dot"/>Found</span>
            <span><span className="legend-dot nf-dot"/>Not Found</span>
          </div>
        </div>

        {/* Scan by type donut-style */}
        <div className="card">
          <h3 className="chart-title">Scans by Type</h3>
          {data?.scansByType?.length > 0 ? (
            <div className="type-list">
              {data.scansByType.map((s, i) => {
                const maxT = Math.max(...data.scansByType.map(x => x.count));
                return (
                  <div key={i} className="type-row">
                    <span className="type-label">{s._id}</span>
                    <MiniBar value={s.count} max={maxT} color={BAR_COLORS[i % BAR_COLORS.length]} />
                    <span className="type-count">{s.count}</span>
                  </div>
                );
              })}
            </div>
          ) : <div className="empty-state">No data</div>}
        </div>

        {/* Top medicines */}
        <div className="card" style={{gridColumn:'1/-1'}}>
          <h3 className="chart-title">Top Scanned Medicines</h3>
          {data?.topMedicines?.length > 0 ? (
            <div className="top-meds-list">
              {data.topMedicines.map((m, i) => (
                <div key={i} className="top-med-row">
                  <span className="top-rank">#{i + 1}</span>
                  <div className="top-med-info">
                    <span className="top-med-name">{m.name}</span>
                    {m.brand && <span className="text-faint text-xs">{m.brand}</span>}
                  </div>
                  <span className="badge badge-blue">{m.category}</span>
                  <MiniBar value={m.count} max={maxTopMed} color={BAR_COLORS[i % BAR_COLORS.length]} />
                  <span className="top-count">{m.count} scans</span>
                </div>
              ))}
            </div>
          ) : <div className="empty-state">No data yet. Start scanning medicines!</div>}
        </div>

        {/* User growth */}
        {data?.userGrowth?.length > 0 && (
          <div className="card">
            <h3 className="chart-title">User Growth (Monthly)</h3>
            <div className="type-list">
              {[...data.userGrowth].reverse().map((u, i) => {
                const maxU = Math.max(...data.userGrowth.map(x => x.count));
                return (
                  <div key={i} className="type-row">
                    <span className="type-label">{u._id}</span>
                    <MiniBar value={u.count} max={maxU} color="#0077cc" />
                    <span className="type-count">+{u.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
