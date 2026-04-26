import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

function DoctorDashboard() {
  const navigate = useNavigate();
  const [currentToken, setCurrentToken] = useState(0);
  const [nextToken, setNextToken] = useState(null);
  const [department, setDepartment] = useState('');
  const [waitingCount, setWaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [calling, setCalling] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.pulse = Math.random() * Math.PI * 2;
      }
      update() {
        this.x += this.speedX; this.y += this.speedY;
        this.pulse += 0.02;
        this.opacity = 0.1 + Math.abs(Math.sin(this.pulse)) * 0.3;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
      }
      draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${this.opacity})`; ctx.fill();
      }
    }
    for (let i = 0; i < 60; i++) particles.push(new Particle());
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    if (!auth.currentUser) { navigate('/doctor-login'); return; }

    const fetchDoctorInfo = async () => {
      const snap = await getDoc(doc(db, 'doctors', auth.currentUser.uid));
      if (snap.exists()) {
        setDoctorName(snap.data().name || 'Doctor');
        setDepartment(snap.data().department || 'General OPD');
      }
    };
    fetchDoctorInfo();
  }, [navigate]);

  useEffect(() => {
    if (!department) return;

    const settingsRef = doc(db, 'departments', department);
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setCurrentToken(snap.data().currentToken || 0);
    });

    const waitingQ = query(
      collection(db, 'queue'),
      where('status', '==', 'waiting'),
      where('department', '==', department)
    );
    const unsubWaiting = onSnapshot(waitingQ, (snapshot) => {
      const patients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      patients.sort((a, b) => a.tokenNumber - b.tokenNumber);
      setWaitingCount(snapshot.size);
      setNextToken(patients[0] || null);
    });

    const completedQ = query(
      collection(db, 'queue'),
      where('status', '==', 'completed'),
      where('department', '==', department)
    );
    const unsubCompleted = onSnapshot(completedQ, (snap) => setCompletedCount(snap.size));

    return () => { unsubSettings(); unsubWaiting(); unsubCompleted(); };
  }, [department]);

  const callNextPatient = async () => {
    if (calling || !nextToken) return;
    setCalling(true);
    try {
      const next = currentToken + 1;
      await setDoc(doc(db, 'departments', department), { currentToken: next }, { merge: true });
      await updateDoc(doc(db, 'queue', nextToken.id), { status: 'completed' });
    } catch (err) { console.error(err); }
    setTimeout(() => setCalling(false), 1000);
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0a1f14 0%, #060d1a 60%, #0a0a0f 100%)',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px',
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <canvas ref={canvasRef} style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '460px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '32px'
          }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                borderRadius: '8px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '14px', color: 'white'
              }}>🩺</div>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>QALM</span>
              <span style={{
                background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '6px', padding: '2px 8px', fontSize: '11px',
                color: '#10b981', fontWeight: '600', letterSpacing: '1px'
              }}>DOCTOR</span>
            </div>
            {doctorName && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>
                Dr. {doctorName} — {department}
              </p>
            )}
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '8px 16px',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '13px'
          }}>Logout</button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}
        >
          {[
            { label: 'NOW CALLING', value: currentToken, color: '#10b981' },
            { label: 'WAITING', value: waitingCount, color: 'white' },
            { label: 'COMPLETED', value: completedCount, color: '#60a5fa' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '18px', padding: '20px 16px',
              backdropFilter: 'blur(20px)', textAlign: 'center',
            }}>
              <div style={{ color: stat.color, fontSize: '36px', fontWeight: '800', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '6px', letterSpacing: '1.5px' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Next patient info */}
        <AnimatePresence>
          {nextToken && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: '18px', padding: '20px 24px',
                marginBottom: '16px'
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Next Patient
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '800', color: 'white', fontSize: '20px',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.4)'
                }}>
                  {nextToken.tokenNumber}
                </div>
                <div>
                  <p style={{ color: 'white', fontWeight: '600', fontSize: '16px', margin: 0 }}>
                    {nextToken.name || 'Patient'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: '4px 0 0 0' }}>
                    Token {nextToken.tokenNumber} — {department}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main call button */}
        <motion.button
          onClick={callNextPatient}
          disabled={calling || !nextToken}
          whileHover={{ scale: calling || !nextToken ? 1 : 1.02 }}
          whileTap={{ scale: calling || !nextToken ? 1 : 0.98 }}
          style={{
            width: '100%', padding: '24px',
            background: calling || !nextToken
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, #059669, #10b981, #34d399)',
            color: calling || !nextToken ? 'rgba(255,255,255,0.3)' : 'white',
            border: `1px solid ${!nextToken ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.3)'}`,
            borderRadius: '20px', fontSize: '20px', fontWeight: '800',
            cursor: calling || !nextToken ? 'not-allowed' : 'pointer',
            boxShadow: calling || !nextToken ? 'none' : '0 12px 40px rgba(16,185,129,0.4)',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            letterSpacing: '0.3px'
          }}>
          {calling ? '⏳ Calling...' : !nextToken ? 'No patients waiting' : '▶ Ready — Call Next Patient'}
        </motion.button>

        <p style={{ textAlign: 'center', marginTop: '16px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
          Tap when you're ready for the next patient
        </p>
      </div>
    </div>
  );
}

export default DoctorDashboard;