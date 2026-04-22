import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

function AdminDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [currentToken, setCurrentToken] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [noshowCount, setNoshowCount] = useState(0);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) { navigate('/admin-login'); return; }

    const settingsRef = doc(db, 'settings', 'hospital');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setCurrentToken(snap.data().currentToken || 0);
    });

    const waitingQ = query(collection(db, 'queue'), where('status', '==', 'waiting'));
    const unsubWaiting = onSnapshot(waitingQ, (snapshot) => {
      const patients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      patients.sort((a, b) => a.tokenNumber - b.tokenNumber);
      setQueue(patients);
      setWaitingCount(snapshot.size);
    });

    const completedQ = query(collection(db, 'queue'), where('status', '==', 'completed'));
    const unsubCompleted = onSnapshot(completedQ, (snap) => setCompletedCount(snap.size));

    const noshowQ = query(collection(db, 'queue'), where('status', '==', 'noshow'));
    const unsubNoshow = onSnapshot(noshowQ, (snap) => setNoshowCount(snap.size));

    return () => { unsubSettings(); unsubWaiting(); unsubCompleted(); unsubNoshow(); };
  }, [navigate]);

  const callNextToken = async () => {
    if (calling) return;
    setCalling(true);
    const next = currentToken + 1;
    await setDoc(doc(db, 'settings', 'hospital'), { currentToken: next }, { merge: true });
    const justCalled = queue.find(p => p.tokenNumber === next);
    if (justCalled) {
      await updateDoc(doc(db, 'queue', justCalled.id), { status: 'completed' });
    }
    setTimeout(() => setCalling(false), 1000);
  };

  const markComplete = async (id) => await updateDoc(doc(db, 'queue', id), { status: 'completed' });
  const markNoShow = async (id) => await updateDoc(doc(db, 'queue', id), { status: 'noshow' });
  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>

      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '10%', left: '5%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '28px', paddingTop: '12px'
          }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px',
                background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                borderRadius: '8px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: 'white'
              }}>Q</div>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '16px', letterSpacing: '1px' }}>QALM</span>
              <span style={{
                background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)',
                borderRadius: '6px', padding: '2px 8px', fontSize: '11px',
                color: '#60a5fa', fontWeight: '600', letterSpacing: '1px'
              }}>ADMIN</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '4px' }}>
              Hospital Queue Control
            </p>
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '8px 16px',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '13px'
          }}>Logout</button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}
        >
          {[
            { label: 'NOW CALLING', value: currentToken, color: '#60a5fa', glow: 'rgba(37,99,235,0.3)' },
            { label: 'WAITING', value: waitingCount, color: 'white', glow: 'transparent' },
            { label: 'COMPLETED', value: completedCount, color: '#4ade80', glow: 'rgba(74,222,128,0.2)' },
            { label: 'NO SHOWS', value: noshowCount, color: '#fbbf24', glow: 'transparent' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '18px', padding: '20px 16px',
              backdropFilter: 'blur(20px)', textAlign: 'center',
              boxShadow: i === 0 ? `0 8px 32px ${stat.glow}` : 'none'
            }}>
              <div style={{ color: stat.color, fontSize: '36px', fontWeight: '800', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '6px', letterSpacing: '1.5px' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Call next button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: '20px' }}
        >
          <motion.button
            onClick={callNextToken}
            disabled={calling || queue.length === 0}
            whileHover={{ scale: calling ? 1 : 1.02 }}
            whileTap={{ scale: calling ? 1 : 0.98 }}
            style={{
              width: '100%', padding: '20px',
              background: calling || queue.length === 0
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #15803d, #16a34a, #22c55e)',
              color: calling || queue.length === 0 ? 'rgba(255,255,255,0.3)' : 'white',
              border: `1px solid ${queue.length === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(34,197,94,0.3)'}`,
              borderRadius: '18px', fontSize: '17px', fontWeight: '700',
              cursor: calling || queue.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: calling || queue.length === 0 ? 'none' : '0 8px 32px rgba(22,163,74,0.4)',
              letterSpacing: '0.3px', backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease'
            }}>
            {calling ? '⏳ Calling...' : queue.length === 0 ? 'No patients waiting' : `▶ Call Token ${currentToken + 1}`}
          </motion.button>
        </motion.div>

        {/* Queue list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '24px', overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Waiting Queue
            </h3>
            <span style={{
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
              borderRadius: '20px', padding: '4px 12px',
              color: '#60a5fa', fontSize: '13px', fontWeight: '600'
            }}>{waitingCount} patients</span>
          </div>

          <AnimatePresence>
            {queue.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '15px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
                Queue is clear
              </div>
            ) : (
              queue.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    padding: '16px 24px',
                    borderBottom: index < queue.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: index === 0 ? 'rgba(37,99,235,0.06)' : 'transparent',
                    transition: 'background 0.3s ease'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '14px',
                      background: index === 0
                        ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)'
                        : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '800', color: index === 0 ? 'white' : 'rgba(255,255,255,0.5)',
                      fontSize: '16px',
                      boxShadow: index === 0 ? '0 4px 16px rgba(37,99,235,0.4)' : 'none'
                    }}>
                      {patient.tokenNumber}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '15px' }}>
                        {patient.name || patient.email?.replace('@hospital.com', '') || 'Patient'}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                        {index === 0 ? '🟢 Next up' : `Position ${index + 1}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => markComplete(patient.id)} style={{
                      padding: '7px 14px',
                      background: 'rgba(74,222,128,0.1)',
                      color: '#4ade80',
                      border: '1px solid rgba(74,222,128,0.2)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                    }}>✓ Done</button>
                    <button onClick={() => markNoShow(patient.id)} style={{
                      padding: '7px 14px',
                      background: 'rgba(251,191,36,0.08)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251,191,36,0.15)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                    }}>✗ No Show</button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default AdminDashboard;