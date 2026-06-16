import React, { useState } from 'react';
import { useAuth, API } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({
    name:    user?.name    || '',
    contact: user?.contact || '',
    address: user?.address || '',
    bloodGroup:   user?.bloodGroup   || '',
    gender:       user?.gender       || '',
    dateOfBirth:  user?.dateOfBirth  ? user.dateOfBirth.split('T')[0] : '',
    allergies:    user?.allergies    || [],
    specialization: user?.specialization || '',
    licenseNumber:  user?.licenseNumber  || '',
    hospital:       user?.hospital       || '',
    emergencyContact: user?.emergencyContact || { name:'', phone:'', relation:'' },
  });
  const [newAllergy, setNewAllergy] = useState('');

  const [pwForm, setPwForm]   = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const setEC = (k, v) => setForm(f => ({...f, emergencyContact: {...f.emergencyContact, [k]: v}}));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.put('/auth/profile', form);
      await refreshUser();
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Min 6 characters required');
    setPwLoading(true);
    try {
      await API.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const downloadQR = () => {
    if (!user?.qrCode) return;
    const a = document.createElement('a');
    a.href = user.qrCode;
    a.download = `${user.patientId}_QR.png`;
    a.click();
  };

  const roleColor = { admin:'red', doctor:'purple', pharmacist:'green', patient:'blue' };

  return (
    <div className="page page-md">
      <div className="profile-header animate-in">
        <h1 className="section-title">My Profile</h1>
        <div style={{display:'flex',gap:10}}>
          {editing
            ? <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            : <button className="btn btn-primary" onClick={() => setEditing(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Profile
              </button>}
        </div>
      </div>

      {/* Profile card */}
      <div className="profile-card card animate-in">
        <div className="profile-card-top">
          <div className="profile-avatar-wrap">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="profile-avatar-img" />
              : <div className="profile-avatar-fallback">{user?.name?.[0]?.toUpperCase()}</div>}
            <div className="profile-provider-badge">{user?.provider === 'google' ? '🇬' : user?.provider === 'github' ? '🐙' : '🔐'}</div>
          </div>
          <div className="profile-info">
            <h2>{user?.name}</h2>
            <p className="text-muted">{user?.email}</p>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
              <span className={`badge badge-${roleColor[user?.role]||'blue'}`}>{user?.role}</span>
              {user?.patientId && <span className="badge badge-gray font-mono">{user.patientId}</span>}
              {user?.isVerified && <span className="badge badge-green">✓ Verified</span>}
            </div>
          </div>
        </div>

        {/* Patient QR */}
        {user?.role === 'patient' && user?.qrCode && (
          <div className="profile-qr-section">
            <div className="pqr-card">
              <div className="pqr-img"><img src={user.qrCode} alt="Patient QR" /></div>
              <div className="pqr-info-col">
                <h4>Patient QR Card</h4>
                <p className="text-muted text-sm">Your unique identification QR code for medical use</p>
                <div className="pqr-detail-rows">
                  {user.patientId && <div className="pqr-row"><span>Patient ID</span><strong className="font-mono">{user.patientId}</strong></div>}
                  {user.bloodGroup && <div className="pqr-row"><span>Blood Group</span><strong className="text-danger">{user.bloodGroup}</strong></div>}
                  {user.allergies?.length > 0 && <div className="pqr-row"><span>Allergies</span><strong className="text-danger">{user.allergies.join(', ')}</strong></div>}
                </div>
                <button className="btn btn-primary btn-sm mt-3" onClick={downloadQR}>⬇ Download QR Card</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card animate-in" style={{marginTop:16}}>
          <h3 style={{marginBottom:20,fontWeight:700}}>Edit Information</h3>
          <form onSubmit={handleSave}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={form.name} onChange={e=>set('name',e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contact</label>
                <input type="tel" className="form-input" value={form.contact} onChange={e=>set('contact',e.target.value)} placeholder="Phone number" />
              </div>
            </div>

            {user?.role === 'patient' && (
              <>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={form.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-input" value={form.gender} onChange={e=>set('gender',e.target.value)}>
                      <option value="">Select</option>
                      <option>male</option><option>female</option><option>other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select className="form-input" value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>
                      <option value="">Select</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input type="text" className="form-input" value={form.address} onChange={e=>set('address',e.target.value)} placeholder="City, State" />
                  </div>
                </div>

                {/* Allergies */}
                <div className="form-group">
                  <label className="form-label">Allergies</label>
                  <div className="tag-row">
                    {form.allergies.map((a,i)=>(
                      <span key={i} className="tag tag-danger">{a}
                        <button type="button" onClick={()=>set('allergies',form.allergies.filter((_,j)=>j!==i))}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="tag-input-row">
                    <input type="text" className="form-input" value={newAllergy} onChange={e=>setNewAllergy(e.target.value)} placeholder="e.g. Penicillin" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(newAllergy.trim()){set('allergies',[...form.allergies,newAllergy.trim()]);setNewAllergy('')}}}} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(newAllergy.trim()){set('allergies',[...form.allergies,newAllergy.trim()]);setNewAllergy('')}}}>Add</button>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="form-group">
                  <label className="form-label">Emergency Contact</label>
                  <div className="grid-2">
                    <input type="text" className="form-input" placeholder="Name" value={form.emergencyContact.name} onChange={e=>setEC('name',e.target.value)} />
                    <input type="tel"  className="form-input" placeholder="Phone" value={form.emergencyContact.phone} onChange={e=>setEC('phone',e.target.value)} />
                    <input type="text" className="form-input" placeholder="Relation (e.g. Father)" value={form.emergencyContact.relation} onChange={e=>setEC('relation',e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {(user?.role === 'doctor') && (
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Specialization</label><input type="text" className="form-input" value={form.specialization} onChange={e=>set('specialization',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">License Number</label><input type="text" className="form-input font-mono" value={form.licenseNumber} onChange={e=>set('licenseNumber',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Hospital</label><input type="text" className="form-input" value={form.hospital} onChange={e=>set('hospital',e.target.value)} /></div>
              </div>
            )}

            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}}/> Saving…</> : '✓ Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password — only for local users */}
      {user?.provider === 'local' && (
        <div className="card animate-in" style={{marginTop:16}}>
          <h3 style={{marginBottom:20,fontWeight:700}}>🔒 Change Password</h3>
          <form onSubmit={handleChangePassword}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type={showPw?'text':'password'} className="form-input" value={pwForm.currentPassword} onChange={e=>setPwForm(p=>({...p,currentPassword:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type={showPw?'text':'password'} className="form-input" value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type={showPw?'text':'password'} className="form-input" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} required />
              </div>
            </div>
            <label className="toggle-label" style={{marginBottom:12}}>
              <input type="checkbox" checked={showPw} onChange={e=>setShowPw(e.target.checked)} />
              <span className="toggle-track"><span className="toggle-thumb"/></span>
              Show passwords
            </label>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account info */}
      <div className="card animate-in" style={{marginTop:16}}>
        <h3 style={{marginBottom:16,fontWeight:700}}>Account Information</h3>
        <div className="account-info-grid">
          <div><span className="text-faint text-xs" style={{textTransform:'uppercase',letterSpacing:'0.06em'}}>Provider</span><p className="font-bold mt-1">{user?.provider}</p></div>
          <div><span className="text-faint text-xs" style={{textTransform:'uppercase',letterSpacing:'0.06em'}}>Member Since</span><p className="font-bold mt-1">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p></div>
          <div><span className="text-faint text-xs" style={{textTransform:'uppercase',letterSpacing:'0.06em'}}>Role</span><p className="font-bold mt-1" style={{textTransform:'capitalize'}}>{user?.role}</p></div>
          <div><span className="text-faint text-xs" style={{textTransform:'uppercase',letterSpacing:'0.06em'}}>Status</span><p className="font-bold mt-1 text-success">Active</p></div>
        </div>
      </div>
    </div>
  );
}
