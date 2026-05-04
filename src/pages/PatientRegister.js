import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { useLanguage, LanguageSwitcher } from '../LanguageContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { DEPARTMENTS as ALL_DEPARTMENTS } from '../constants';
import ParticleCanvas from '../components/ParticleCanvas';

function PatientRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [preferredDept, setPreferredDept] = useState('');
  const [activeDepartments, setActiveDepartments] = useState(ALL_DEPARTMENTS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    getDoc(doc(db, 'settings', 'hospital')).then(snap => {
      if (snap.exists() && snap.data().activeDepartments?.length) {
        setActiveDepartments(snap.data().activeDepartments);
      }
    });
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (phone.length !== 10) { setError(t.phoneLength); return; }
    if (password.length < 6) { setError(t.passwordLength); return; }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, phone + '@hospital.com', password);
      await setDoc(doc(db, 'patients', userCredential.user.uid), {
        name, phone, createdAt: new Date(), role: 'patient',
      });
      await setDoc(doc(db, 'pending', userCredential.user.uid), {
        name, phone,
        userId: userCredential.user.uid,
        status: 'pending',
        arrivedAt: serverTimestamp(),
        ...(preferredDept ? { preferredDept } : {}),
      });
      navigate('/patient-dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError(t.phoneRegistered);
      } else {
        setError(t.registrationFailed);
      }
    }
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
            {t.createAccountTitle}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
            {t.joinQalm}
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

        <form onSubmit={handleRegister}>
          {[
            { label: t.fullName, key: 'name', type: 'text', placeholder: 'Your full name', value: name, setter: setName },
            { label: t.phoneNumber, key: 'phone', type: 'tel', placeholder: '10-digit phone number', value: phone, setter: setPhone },
            { label: t.password, key: 'password', type: 'password', placeholder: t.minPassword, value: password, setter: setPassword },
          ].map((field, i) => (
            <div key={i} style={{ marginBottom: i === 2 ? '20px' : '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                {field.label}
              </label>
              <input
                type={field.type} placeholder={field.placeholder}
                value={field.value} onChange={(e) => field.setter(e.target.value)}
                onFocus={() => setFocused(field.key)} onBlur={() => setFocused('')}
                required style={inputStyle(field.key)}
              />
            </div>
          ))}

          <div style={{ marginBottom: '28px' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
              {t.departmentOptional}
            </label>
            <select
              value={preferredDept}
              onChange={e => setPreferredDept(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', fontSize: '15px',
                color: preferredDept ? 'white' : 'rgba(255,255,255,0.35)',
                boxSizing: 'border-box', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#0f1f3d', color: 'rgba(255,255,255,0.5)' }}>{t.selectDept}</option>
              {activeDepartments.map(dept => (
                <option key={dept} value={dept} style={{ background: '#0f1f3d', color: 'white' }}>{dept}</option>
              ))}
            </select>
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
            {loading ? t.creatingAccount : t.register}
          </motion.button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
            {t.alreadyRegistered}{' '}
            <span onClick={() => navigate('/patient-login')} style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: '600' }}>
              {t.signInLink}
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

export default PatientRegister;
