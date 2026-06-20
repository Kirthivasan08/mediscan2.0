import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './MedicineDetail.css';

// const TABS = ['overview','dosage','safety','storage','interactions'];

export default function MedicineDetail() {
  const { id }       = useParams();
  const { user }     = useAuth();
  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saved,   setSaved]     = useState(false);
  // const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    API.get(`/medicines/${id}`)
      .then(({ data }) => {
        setMedicine(data.medicine);
        setSaved(user?.savedMedicines?.some(m => m === id || m?._id === id));
      })
      .catch(() => toast.error('Medicine not found'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const toggleSave = async () => {
    if (!user) return toast.error('Please login to save medicines');
    try {
      if (saved) {
        await API.delete(`/medicines/${id}/save`);
        setSaved(false);
        toast.success('Removed from saved');
      } else {
        await API.post(`/medicines/${id}/save`);
        setSaved(true);
        toast.success('Medicine saved!');
      }
    } catch {
      toast.error('Failed');
    }
  };

  const downloadQR = () => {
    if (!medicine?.qrCode) return;
    const a = document.createElement('a');
    a.href = medicine.qrCode;
    a.download = `${medicine.name.replace(/\s+/g,'_')}_QR.png`;
    a.click();
    toast.success('QR downloaded!');
  };

  const downloadPDF = async () => {
    try {
      const res = await API.get(`/reports/medicine/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${medicine.name.replace(/\s+/g,'_')}_info.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('PDF generation failed');
    }
  };

  // ✅ FIXED FUNCTION
  const regenerateQR = async () => {
    try {
      const { data } = await API.post(`/medicines/${id}/regenerate-qr`);
      setMedicine(m => ({ ...m, qrCode: data.qrCode }));
      toast.success('QR regenerated');
    } catch {
      toast.error('Failed');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/></div>;
  if (!medicine) return <div className="page text-center"><h2>Medicine not found</h2><Link to="/medicines" className="btn btn-primary mt-4">Back to list</Link></div>;

  const exp = medicine.expiryStatus;
  const expColor = exp==='expired'?'badge-red':exp==='near_expiry'?'badge-yellow':'badge-green';
  const expLabel = exp==='expired'?'⚠ Expired':exp==='near_expiry'?'⚠ Near Expiry':'✓ Valid';
  const canEdit = user && (user.role==='admin'||user.role==='pharmacist');

  return (
    <div className="page">
      <nav className="breadcrumb animate-in">
        <Link to="/medicines">Medicines</Link>
        <span>/</span>
        <span className="truncate">{medicine.name}</span>
      </nav>

      <div className="detail-header animate-in">
        <div className="detail-title-area">
          <div className="detail-badges">
            <span className={`badge ${expColor}`}>{expLabel}</span>
            <span className="badge badge-blue">{medicine.category}</span>
            {medicine.prescriptionRequired && <span className="badge badge-purple">Rx Required</span>}
            {medicine.dosageForm && <span className="badge badge-gray">{medicine.dosageForm}</span>}
          </div>

          <h1 className="detail-name">{medicine.name}</h1>
          {medicine.genericName && <p className="detail-generic">{medicine.genericName}</p>}
        </div>

        <div className="detail-actions-col">
          <button className={`btn ${saved?'btn-secondary':'btn-ghost'}`} onClick={toggleSave}>
            {saved ? 'Saved' : 'Save'}
          </button>

          <button className="btn btn-secondary" onClick={downloadPDF}>
            PDF
          </button>

          {canEdit && <Link to={`/edit-medicine/${medicine._id}`} className="btn btn-ghost">Edit</Link>}
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <p>{medicine.description}</p>
        </div>

        <div className="detail-sidebar">
          <div className="qr-panel card animate-in">
            <h3>QR Code</h3>

            {medicine.qrCode ? (
              <>
                <img src={medicine.qrCode} alt="QR" />
                <button className="btn btn-primary" onClick={downloadQR}>
                  Download QR
                </button>

                {canEdit && (
                  <button className="btn btn-secondary" onClick={regenerateQR}>
                    🔄 Regenerate QR
                  </button>
                )}
              </>
            ) : (
              <button onClick={regenerateQR}>Generate QR</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}