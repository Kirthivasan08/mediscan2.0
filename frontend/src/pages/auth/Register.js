import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const ROLES = [
  { value:'patient',    label:'Patient',    icon:'🧑‍⚕️', desc:'Access your medical records' },
  { value:'doctor',     label:'Doctor',     icon:'👨‍⚕️', desc:'Manage patient treatment' },
  { value:'pharmacist', label:'Pharmacist', icon:'💊',   desc:'Manage medicine database' },
  { value:'admin',      label:'Admin',      icon:'🔐',   desc:'Full system access' },
];

export default function Register() {
  const [form, setForm] = useState({
    name:'', email:'', password:'', role:'patient'
  });

  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // basic validation
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }

    if (!form.name || !form.email) {
      return toast.error('All fields are required');
    }

    setLoading(true);

    try {
      // ✅ SEND ONLY REQUIRED FIELDS
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      };

      console.log("Sending:", payload); // debug

      await register(payload);

      toast.success('Account created! Please sign in.');
      navigate('/login');

    } catch (err) {
      console.log(err.response?.data);
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* LEFT */}
      <div className="auth-left hide-mobile">
        <div className="auth-illustration">
          <div className="illus-circle">
            <svg viewBox="0 0 80 80" fill="none">
              <rect x="10" y="10" width="60" height="60" rx="12" fill="rgba(255,255,255,0.15)"/>
            </svg>
          </div>
          <h2>Join MediScan</h2>
          <p>Smart QR-based medicine information system.</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-card">

          <h1>Create account</h1>

          <form onSubmit={handleSubmit}>

            {/* ROLE */}
            <div className="form-group">
              <label>I am a...</label>
              <div className="role-grid">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    className={`role-btn ${form.role === r.value ? 'selected' : ''}`}
                    onClick={() => set('role', r.value)}
                  >
                    <span className="role-icon">{r.icon}</span>
                    <span className="role-label">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* NAME */}
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Full Name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </div>

            {/* EMAIL */}
            <div className="form-group">
              <input
                type="email"
                className="form-input"
                placeholder="Email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="Password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>

            {/* SUBMIT */}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>

          </form>

          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

        </div>
      </div>
    </div>
  );
}