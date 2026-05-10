import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import ParticleCanvas from '../components/ParticleCanvas';

function DoctorLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email?.endsWith('@hospital-doctor.com')) {
        navigate('/doctor-dashboard');
      } else if (user) {
        signOut(auth).then(() => setChecking(false));
      } else {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, phone + '@hospital-doctor.com', password);
      const doctorSnap = await getDoc(doc(db, 'doctors', credential.user.uid));
      if (doctorSnap.exists()) {
        localStorage.setItem('qalm_hospital_id', doctorSnap.data().hospitalId || 'default');
      }
      navigate('/doctor-dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  };

  const inputStyle = (name) => ({
    width: '100%', padding: '14px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${focused === name ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '12px', fontSize: '15px', color: 'white',
    boxSizing: 'border-box', outline: 'none', transition: 'all 0.3s ease',
    boxShadow: focused === name ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
  });

  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 80% 50%, #051a10 0%, #060d1a 60%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', fontFamily: 'DM Sans, sans-serif' }}>Loading...</p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 80% 50%, #051a10 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <ParticleCanvas color="#10b981" count={60} />

      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 1,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '28px', padding: '44px 40px',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
          position: 'relative', zIndex: 2,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15, type: 'spring', stiffness: 220 }}
            style={{
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', margin: '0 auto 20px auto',
              boxShadow: '0 8px 28px rgba(16,185,129,0.4)',
            }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </motion.div>

          <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>Doctor Login</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Access your patient queue</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px', padding: '12px 16px',
              color: '#fca5a5', fontSize: '13px', textAlign: 'center', marginBottom: '20px',
            }}>{error}</motion.div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
              Phone Number
            </label>
            <input
              type="tel" placeholder="Your phone number"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setFocused('phone')} onBlur={() => setFocused('')}
              required style={inputStyle('phone')}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
              Password
            </label>
            <input
              type="password" placeholder="Your password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              required style={inputStyle('password')}
            />
          </div>

          <motion.button
            type="submit" disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '15px',
              background: loading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #059669, #10b981)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              boxShadow: loading ? 'none' : '0 8px 28px rgba(16,185,129,0.4)',
            }}>
            {loading ? 'Signing in...' : 'Access Queue'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px' }}>
          <span onClick={() => navigate('/')} style={{ color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '13px' }}>
            Back to home
          </span>
        </p>
      </motion.div>
    </div>
  );
}

export default DoctorLogin;
