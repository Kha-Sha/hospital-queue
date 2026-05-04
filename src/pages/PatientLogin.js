import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useLanguage, LanguageSwitcher } from '../LanguageContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'framer-motion';
import ParticleCanvas from '../components/ParticleCanvas';

function PatientLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (auth.currentUser) {
      localStorage.removeItem('qalm_seen_' + auth.currentUser.uid);
      navigate('/patient-dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let user;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, phone + '@hospital.com', password);
      user = userCredential.user;
    } catch (err) {
      setError(t.invalidCredentials);
      setLoading(false);
      return;
    }

    try {
      const { getDoc, doc, setDoc, getDocs, collection, query, where, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const patientSnap = await getDoc(doc(db, 'patients', user.uid));
      const patientData = patientSnap.exists() ? patientSnap.data() : {};

      const existingQ = query(collection(db, 'queue'), where('userId', '==', user.uid), where('status', '==', 'waiting'));
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        navigate('/patient-dashboard');
        setLoading(false);
        return;
      }

      const pendingSnap = await getDoc(doc(db, 'pending', user.uid));
      if (pendingSnap.exists() && pendingSnap.data().status === 'pending') {
        navigate('/patient-dashboard');
        setLoading(false);
        return;
      }

      await setDoc(doc(db, 'pending', user.uid), {
        name: patientData.name || phone,
        phone: patientData.phone || phone,
        userId: user.uid,
        status: 'pending',
        arrivedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Firestore error during login flow:', err);
      setError('Connection issue. Please try again.');
      setLoading(false);
      return;
    }

    navigate('/patient-dashboard');
    setLoading(false);
  };

  const inputStyle = (name) => ({
    width: '100%', padding: '14px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${focused === name ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '12px', fontSize: '15px', color: 'white',
    boxSizing: 'border-box', outline: 'none', transition: 'all 0.3s ease',
    boxShadow: focused === name ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <ParticleCanvas />
      <LanguageSwitcher />

      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
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
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: '700', color: 'white',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 28px rgba(37,99,235,0.45)',
            }}>Q</motion.div>

          <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '600', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {t.welcomeBack}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
            {t.signInToTrack}
          </p>
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
              {t.phoneNumber}
            </label>
            <input
              type="tel" placeholder="10-digit phone number"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setFocused('phone')} onBlur={() => setFocused('')}
              required style={inputStyle('phone')}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
              {t.password}
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
              background: loading ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              boxShadow: loading ? 'none' : '0 8px 28px rgba(37,99,235,0.4)',
            }}>
            {loading ? t.signingIn : t.signIn}
          </motion.button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
            {t.newPatient}{' '}
            <span onClick={() => navigate('/patient-register')} style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: '600' }}>
              {t.createAccount}
            </span>
          </p>
          <span onClick={() => navigate('/')} style={{ color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '12px' }}>
            {t.back}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default PatientLogin;
