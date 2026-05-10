import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';

const PatientLogin = React.lazy(() => import('./pages/PatientLogin'));
const PatientRegister = React.lazy(() => import('./pages/PatientRegister'));
const PatientDashboard = React.lazy(() => import('./pages/PatientDashboard'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminSetup = React.lazy(() => import('./pages/AdminSetup'));
const DoctorLogin = React.lazy(() => import('./pages/DoctorLogin'));
const DoctorDashboard = React.lazy(() => import('./pages/DoctorDashboard'));
const QRCard = React.lazy(() => import('./pages/QRCard'));

const SuspenseFallback = (
  <div style={{
    minHeight: '100vh', background: '#060d1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif',
  }}>
    Loading...
  </div>
);

function App() {
  return (
    <Router>
      <React.Suspense fallback={SuspenseFallback}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/patient-login" element={<PatientLogin />} />
          <Route path="/patient-register" element={<PatientRegister />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-setup" element={<AdminSetup />} />
          <Route path="/doctor-login" element={<DoctorLogin />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/qr-card" element={<QRCard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
