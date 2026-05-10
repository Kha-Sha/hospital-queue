import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, getHospitalId } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, runTransaction } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleCanvas from '../components/ParticleCanvas';

function DoctorDashboard() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentToken, setCurrentToken] = useState(0);
  const [nextToken, setNextToken] = useState(null);
  const [department, setDepartment] = useState('');
  const [waitingCount, setWaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [calling, setCalling] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/doctor-login'); return; }
      if (!user.email?.endsWith('@hospital-doctor.com')) { navigate('/doctor-login'); return; }

      setAuthLoading(false);

      try {
        const snap = await getDoc(doc(db, 'hospitals', getHospitalId(), 'doctors', user.uid));
        if (snap.exists()) {
          if (snap.data().active === false) {
            setIsDeactivated(true);
            return;
          }
          setDoctorName(snap.data().name || 'Doctor');
          setDepartment(snap.data().department || 'General OPD');
        } else {
          setNotConfigured(true);
        }
      } catch (err) {
        console.error('Failed to fetch doctor info:', err);
        setNotConfigured(true);
      }
    });
    return () => unsubAuth();
  }, [navigate]);

  useEffect(() => {
    if (!department) return;

    const unsubSettings = onSnapshot(doc(db, 'hospitals', getHospitalId(), 'departments', department), (snap) => {
      if (snap.exists()) setCurrentToken(snap.data().currentToken || 0);
    });

    const waitingQ = query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'waiting'), where('department', '==', department));
    const unsubWaiting = onSnapshot(waitingQ, (snapshot) => {
      const patients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      patients.sort((a, b) => a.tokenNumber - b.tokenNumber);
      setWaitingCount(snapshot.size);
      setNextToken(patients[0] || null);
    });

    const completedQ = query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'completed'), where('department', '==', department));
    const unsubCompleted = onSnapshot(completedQ, (snap) => setCompletedCount(snap.size));

    return () => { unsubSettings(); unsubWaiting(); unsubCompleted(); };
  }, [department]);

  const callNextPatient = async () => {
    if (calling || !nextToken) return;
    setCalling(true);
    try {
      const deptRef = doc(db, 'hospitals', getHospitalId(), 'departments', department);
      const queueRef = doc(db, 'hospitals', getHospitalId(), 'queue', nextToken.id);
      await runTransaction(db, async (transaction) => {
        transaction.set(deptRef, { currentToken: nextToken.tokenNumber }, { merge: true });
        transaction.update(queueRef, { status: 'completed' });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setCalling(false), 1000);
    }
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 50%, #0a1f14 0%, #060d1a 60%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', fontFamily: "'Segoe UI', sans-serif" }}>Loading...</p>
    </div>
  );

  if (isDeactivated) return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 50%, #0a1f14 0%, #060d1a 60%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(40px)', textAlign: 'center', maxWidth: '380px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠</div>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Account deactivated</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>Your account has been deactivated. Please contact your clinic admin.</p>
        <button onClick={handleLogout} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
      </div>
    </div>
  );

  if (notConfigured) return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 50%, #0a1f14 0%, #060d1a 60%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(40px)', textAlign: 'center', maxWidth: '380px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: 'rgba(239,68,68,0.6)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Account not configured</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>Your account is not configured. Please contact admin.</p>
        <button onClick={handleLogout} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 50%, #0a1f14 0%, #060d1a 60%, #0a0a0f 100%)', padding: '20px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ParticleCanvas color="#10b981" count={60} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '460px' }}>

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'white' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>QALM</span>
              <span style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#10b981', fontWeight: '600', letterSpacing: '1px' }}>DOCTOR</span>
            </div>
            {doctorName && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '4px' }}>Dr. {doctorName} — {department}</p>}
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Logout</button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'NOW CALLING', value: currentToken, color: '#10b981' },
            { label: 'WAITING', value: waitingCount, color: 'white' },
            { label: 'COMPLETED', value: completedCount, color: '#60a5fa' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px 14px', backdropFilter: 'blur(20px)', textAlign: 'center' }}>
              <div style={{ color: stat.color, fontSize: '32px', fontWeight: '400', lineHeight: 1, fontFamily: "'DM Serif Display', Georgia, serif" }}>{stat.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '6px', letterSpacing: '1.2px' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        <AnimatePresence>
          {nextToken && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '18px', padding: '20px 24px', marginBottom: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Next Patient</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: '400', color: 'white', fontSize: '20px', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
                  {nextToken.tokenNumber}
                </div>
                <div>
                  <p style={{ color: 'white', fontWeight: '600', fontSize: '16px', margin: 0 }}>{nextToken.name || 'Patient'}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: '4px 0 0 0' }}>Token {nextToken.tokenNumber} — {department}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button onClick={callNextPatient} disabled={calling || !nextToken}
          whileHover={{ scale: calling || !nextToken ? 1 : 1.02 }}
          whileTap={{ scale: calling || !nextToken ? 1 : 0.98 }}
          style={{ width: '100%', padding: '22px', background: calling || !nextToken ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #059669, #10b981)', color: calling || !nextToken ? 'rgba(255,255,255,0.25)' : 'white', border: `1px solid ${!nextToken ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.3)'}`, borderRadius: '18px', fontSize: '18px', fontWeight: '700', cursor: calling || !nextToken ? 'not-allowed' : 'pointer', boxShadow: calling || !nextToken ? 'none' : '0 12px 36px rgba(16,185,129,0.35)', backdropFilter: 'blur(20px)', transition: 'all 0.3s ease' }}>
          {calling ? 'Calling...' : !nextToken ? 'No patients waiting' : 'Call Next Patient'}
        </motion.button>

        <p style={{ textAlign: 'center', marginTop: '14px', color: 'rgba(255,255,255,0.18)', fontSize: '12px' }}>
          Tap when you're ready for the next patient
        </p>
      </div>
    </div>
  );
}

export default React.memo(DoctorDashboard);
