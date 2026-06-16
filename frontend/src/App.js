import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';
import { LangProvider }          from './context/LangContext';
import Navbar from './components/layout/Navbar';

// Pages
import Home              from './pages/home/Home';
import Login             from './pages/auth/Login';
import Register          from './pages/auth/Register';
import OAuthSuccess      from './pages/auth/OAuthSuccess';
import Dashboard         from './pages/dashboard/Dashboard';
import Scanner           from './pages/scanner/Scanner';
import ScanHistory       from './pages/scanner/ScanHistory';
import Medicines         from './pages/medicine/Medicines';
import MedicineDetail    from './pages/medicine/MedicineDetail';
import AddMedicine       from './pages/medicine/AddMedicine';
import InteractionChecker from './pages/medicine/InteractionChecker';
import PatientDetail     from './pages/patient/PatientDetail';
import Profile           from './pages/profile/Profile';
import TreatmentForm     from './pages/patient/TreatmentForm';
import Analytics         from './pages/admin/Analytics';
import BulkImport        from './pages/admin/BulkImport';
import AuditLog          from './pages/admin/AuditLog';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:48,height:48}}/><p style={{color:'var(--text-2)',marginTop:12}}>Loading…</p></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <>
    <Navbar/>
    <Routes>
      {/* Public */}
      <Route path="/"          element={<Home/>}/>
      <Route path="/login"     element={<Login/>}/>
      <Route path="/register"  element={<Register/>}/>
      <Route path="/auth/oauth-success" element={<OAuthSuccess/>}/>
      <Route path="/medicines"     element={<Medicines/>}/>
      <Route path="/medicine/:id"  element={<MedicineDetail/>}/>
      <Route path="/interactions"  element={<InteractionChecker/>}/>

      {/* Protected - any logged-in user */}
      <Route path="/scan"          element={<ProtectedRoute><Scanner/></ProtectedRoute>}/>
      <Route path="/scan-history"  element={<ProtectedRoute><ScanHistory/></ProtectedRoute>}/>
      <Route path="/dashboard"     element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
      <Route path="/profile"       element={<ProtectedRoute><Profile/></ProtectedRoute>}/>
      <Route path="/patient/:id"   element={<ProtectedRoute><PatientDetail/></ProtectedRoute>}/>
      <Route path="/my-treatments" element={<ProtectedRoute roles={['patient']}><PatientDetail/></ProtectedRoute>}/>
      <Route path="/treatments/new" element={<ProtectedRoute roles={['admin','doctor']}><TreatmentForm/></ProtectedRoute>}/>
      <Route path="/treatments/:id/edit" element={<ProtectedRoute roles={['admin','doctor']}><TreatmentForm/></ProtectedRoute>}/>

      {/* Protected - admin / pharmacist / doctor */}
      <Route path="/add-medicine"       element={<ProtectedRoute roles={['admin','pharmacist','doctor']}><AddMedicine/></ProtectedRoute>}/>
      <Route path="/edit-medicine/:id"  element={<ProtectedRoute roles={['admin','pharmacist']}><AddMedicine/></ProtectedRoute>}/>
      <Route path="/analytics"          element={<ProtectedRoute roles={['admin','pharmacist','doctor']}><Analytics/></ProtectedRoute>}/>
      <Route path="/bulk-import"        element={<ProtectedRoute roles={['admin','pharmacist']}><BulkImport/></ProtectedRoute>}/>
      <Route path="/audit-log"          element={<ProtectedRoute roles={['admin']}><AuditLog/></ProtectedRoute>}/>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </>
);

export default function App() {
  return (
    <Router>
      <LangProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background:'#fff',color:'#1a2332',border:'1.5px solid #d0e4f7',borderRadius:'12px',fontSize:'14px',fontFamily:'Sora,sans-serif',boxShadow:'0 4px 20px rgba(0,0,0,0.10)' },
              success: { iconTheme: { primary:'#00b894',secondary:'#fff' } },
              error:   { iconTheme: { primary:'#e53e3e',secondary:'#fff' } },
            }}
          />
          <AppRoutes/>
        </AuthProvider>
      </LangProvider>
    </Router>
  );
}
