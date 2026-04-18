import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Home = React.lazy(() => import('./pages/Home'));
const PatientLogin = React.lazy(() => import('./pages/PatientLogin'));
const PatientDashboard = React.lazy(() => import('./pages/PatientDashboard'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <Router>
      <React.Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/patient-login" element={<PatientLogin />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;