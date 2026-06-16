import React, { useState, useRef } from 'react';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './BulkImport.css';

const TEMPLATE_HEADERS = [
  'Name','Generic Name','Brand','Manufacturer','Batch Number','Barcode',
  'Category','Dosage Form','Strength','Description','Price','MRP',
  'Manufacturing Date','Expiry Date','Prescription Required',
];

export default function BulkImport() {
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef(null);

  const downloadTemplate = () => {
    const rows = [
      TEMPLATE_HEADERS,
      ['Paracetamol','Acetaminophen','Crocin','GSK','PCM-001','','analgesic','tablet','500mg','Pain reliever','15','20','2024-01-01','2025-12-31','No'],
      ['Amoxicillin','','Mox','Cipla','AMX-002','','antibiotic','capsule','500mg','Antibiotic','45','60','2024-03-01','2026-02-28','Yes'],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'medicines_import_template.csv';
    a.click();
    toast.success('Template downloaded!');
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) return toast.error('Only .xlsx, .xls, or .csv files allowed');
    setFile(f);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return toast.error('Please select a file');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await API.post('/import/medicines', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.results);
      if (data.results.success > 0) toast.success(`${data.results.success} medicines imported!`);
      if (data.results.failed > 0) toast.error(`${data.results.failed} rows failed`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await API.get('/export/medicines', { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'medicines_export.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Medicines exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="page page-md">
      <div className="animate-in" style={{marginBottom:24}}>
        <h1 className="section-title">📥 Bulk Import / Export</h1>
        <p className="section-sub">Import medicines from Excel/CSV or export the full database</p>
      </div>

      <div className="bulk-layout">
        {/* Import card */}
        <div className="card animate-in">
          <h3 style={{fontWeight:700,marginBottom:6}}>Import Medicines</h3>
          <p className="text-muted text-sm" style={{marginBottom:16}}>Upload an Excel (.xlsx) or CSV file. Download the template to see the expected format.</p>

          <button className="btn btn-secondary btn-sm" style={{marginBottom:16}} onClick={downloadTemplate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Template
          </button>

          {/* Drop zone */}
          <div
            className={`drop-zone ${file ? 'has-file' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
            onDragLeave={e => e.currentTarget.classList.remove('dragging')}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.classList.remove('dragging');
              const f = e.dataTransfer.files[0];
              if (f) { const fe = { target: { files: [f] } }; handleFileChange(fe); }
            }}
          >
            <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{display:'none'}} />
            {file ? (
              <>
                <div style={{fontSize:32,marginBottom:8}}>📊</div>
                <p className="font-bold">{file.name}</p>
                <p className="text-muted text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={e => { e.stopPropagation(); setFile(null); if(fileRef.current) fileRef.current.value=''; }}>
                  Remove
                </button>
              </>
            ) : (
              <>
                <div style={{fontSize:32,marginBottom:8}}>📂</div>
                <p className="font-bold">Click or drag file here</p>
                <p className="text-muted text-sm">.xlsx, .xls, or .csv</p>
              </>
            )}
          </div>

          <button className="btn btn-primary btn-full btn-lg" style={{marginTop:16}} onClick={handleImport} disabled={!file || loading}>
            {loading ? <><div className="spinner" style={{width:18,height:18,borderWidth:2}}/> Importing…</> : '⬆ Import Medicines'}
          </button>

          {/* Result */}
          {result && (
            <div className="import-result animate-in">
              <div className="result-row"><span className="text-success">✓ Imported</span><strong className="text-success">{result.success}</strong></div>
              <div className="result-row"><span className="text-danger">✗ Failed</span><strong className="text-danger">{result.failed}</strong></div>
              {result.errors?.length > 0 && (
                <div className="error-list">
                  <p className="text-sm font-bold" style={{marginBottom:6}}>Errors:</p>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-sm text-danger">Row {e.row}: {e.error}</p>
                  ))}
                  {result.errors.length > 5 && <p className="text-sm text-muted">+{result.errors.length - 5} more errors</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export card */}
        <div className="card animate-in">
          <h3 style={{fontWeight:700,marginBottom:6}}>Export Medicines</h3>
          <p className="text-muted text-sm" style={{marginBottom:20}}>Download the complete medicines database as an Excel file. Includes all fields, expiry status, and scan counts.</p>

          <div className="export-preview">
            <div className="export-col-list">
              {['Medicine ID','Name','Generic Name','Brand','Manufacturer','Category','Dosage Form','Strength','Price','Expiry Date','Expiry Status','Scan Count'].map(col => (
                <span key={col} className="export-col-tag">{col}</span>
              ))}
            </div>
          </div>

          <button className="btn btn-success btn-full btn-lg" style={{marginTop:16}} onClick={handleExport} disabled={exporting}>
            {exporting
              ? <><div className="spinner" style={{width:18,height:18,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}}/> Exporting…</>
              : '⬇ Export to Excel'}
          </button>

          {/* Format tips */}
          <div className="format-tips">
            <h4>Import Format Tips</h4>
            <ul>
              <li>First row must be column headers (use the template)</li>
              <li>Date format: YYYY-MM-DD (e.g. 2025-12-31)</li>
              <li>Category must be one of: analgesic, antibiotic, antiviral, cardiovascular, diabetes, respiratory, vitamin, other</li>
              <li>Prescription Required: Yes / No</li>
              <li>Maximum 500 rows per import</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
