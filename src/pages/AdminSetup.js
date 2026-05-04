import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, getHospitalId } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { DEPARTMENTS } from '../constants';

function AdminSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [hospitalName, setHospitalName] = useState('');
  const [activeDepts, setActiveDepts] = useState(new Set(DEPARTMENTS));
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    if (!auth.currentUser) { navigate('/admin-login'); return; }
  }, [navigate]);

  const toggleDept = (dept) => {
    setActiveDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) { if (next.size > 1) next.delete(dept); }
      else next.add(dept);
      return next;
    });
  };

  const handleFinish = async () => {
    if (!hospitalName.trim()) return;
    setSaving(true);
    setSetupError('');
    try {
      if (auth.currentUser) {
        localStorage.setItem('qalm_hospital_id', auth.currentUser.uid);
      }
      const today = new Date().toDateString();
      await setDoc(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), {
        hospitalName: hospitalName.trim(),
        activeDepartments: [...activeDepts],
        currentToken: 0,
        lastToken: 0,
        lastReset: today,
      }, { merge: true });
      setStep(3);
    } catch (err) {
      setSetupError('Failed to save settings. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const StepDot = ({ n }) => (
    <div style={{
      width: n === step ? '28px' : '8px',
      height: '8px',
      borderRadius: '4px',
      background: n <= step ? '#2563eb' : 'rgba(255,255,255,0.15)',
      transition: 'all 0.3s ease',
    }} />
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif", padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Step indicator */}
        {step < 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '32px' }}>
            <StepDot n={1} />
            <StepDot n={2} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '28px', padding: '48px 40px',
                backdropFilter: 'blur(40px)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                  borderRadius: '10px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '18px', fontWeight: '900', color: 'white'
                }}>Q</div>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '18px', letterSpacing: '1px' }}>QALM</span>
              </div>

              <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
                Welcome! Let's set up your hospital.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
                This takes 30 seconds. You can always change these settings later.
              </p>

              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                HOSPITAL NAME
              </label>
              <input
                autoFocus
                placeholder="e.g. City General Hospital"
                value={hospitalName}
                onChange={e => setHospitalName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && hospitalName.trim() && setStep(2)}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px', color: 'white',
                  fontSize: '16px', outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />

              <button
                onClick={() => hospitalName.trim() && setStep(2)}
                disabled={!hospitalName.trim()}
                style={{
                  width: '100%', marginTop: '20px', padding: '16px',
                  background: hospitalName.trim() ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.06)',
                  color: hospitalName.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                  border: 'none', borderRadius: '12px',
                  fontSize: '16px', fontWeight: '700', cursor: hospitalName.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: hospitalName.trim() ? '0 8px 24px rgba(37,99,235,0.35)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                Continue →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '28px', padding: '40px',
                backdropFilter: 'blur(40px)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
              }}
            >
              <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
                Select active departments
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
                All 13 departments are active by default. Tap to deactivate any you don't need.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
                {DEPARTMENTS.map(dept => {
                  const active = activeDepts.has(dept);
                  return (
                    <button
                      key={dept}
                      onClick={() => toggleDept(dept)}
                      style={{
                        padding: '8px 14px',
                        background: active ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '20px',
                        color: active ? '#60a5fa' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {active ? '✓ ' : ''}{dept}
                    </button>
                  );
                })}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginBottom: '20px' }}>
                {activeDepts.size} of {DEPARTMENTS.length} departments active
              </p>

              {setupError && (
                <p style={{ color: '#fca5a5', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                  {setupError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontSize: '15px', fontWeight: '600',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  style={{
                    flex: 2, padding: '14px',
                    background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: saving ? 'rgba(255,255,255,0.3)' : 'white',
                    border: 'none', borderRadius: '12px',
                    fontSize: '15px', fontWeight: '700',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 8px 24px rgba(37,99,235,0.35)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {saving ? 'Saving...' : 'Finish Setup →'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '28px', padding: '52px 40px',
                backdropFilter: 'blur(40px)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
                textAlign: 'center',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
                style={{ fontSize: '64px', marginBottom: '24px', lineHeight: 1 }}
              >
                🏥
              </motion.div>
              <h2 style={{ color: 'white', fontSize: '26px', fontWeight: '800', marginBottom: '10px' }}>
                You're all set!
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '8px' }}>
                {hospitalName}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '36px', lineHeight: 1.6 }}>
                {activeDepts.size} departments active. Your queue is ready to go.
              </p>

              <button
                onClick={() => navigate('/admin-dashboard')}
                style={{
                  padding: '16px 40px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                }}
              >
                Go to Dashboard →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AdminSetup;
