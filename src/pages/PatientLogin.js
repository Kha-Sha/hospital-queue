import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'framer-motion';

function PatientLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (auth.currentUser) { navigate('/patient-dashboard'); return; }
  }, [navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isLowEnd = navigator.hardwareConcurrency <= 2 || window.innerWidth < 400;
    if (isLowEnd) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
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
        this.x += this.speedX;
        this.y += this.speedY;
        this.pulse += 0.02;
        this.opacity = 0.1 + Math.abs(Math.sin(this.pulse)) * 0.3;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,179,237,${this.opacity})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let user;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, phone + '@hospital.com', password);
      user = userCredential.user;
    } catch (err) {
      setError('Invalid phone number or password');
      setLoading(false);
      return;
    }

    try {
      const { getDoc, doc, setDoc, getDocs, collection, query, where, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const patientSnap = await getDoc(doc(db, 'patients', user.uid));
      const patientData = patientSnap.exists() ? patientSnap.data() : {};

      // 1. Already has a waiting token — go straight to dashboard
      const existingQ = query(collection(db, 'queue'), where('userId', '==', user.uid), where('status', '==', 'waiting'));
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        navigate('/patient-dashboard');
        setLoading(false);
        return;
      }

      // 2. Already waiting for receptionist — go straight to dashboard
      const pendingSnap = await getDoc(doc(db, 'pending', user.uid));
      if (pendingSnap.exists() && pendingSnap.data().status === 'pending') {
        navigate('/patient-dashboard');
        setLoading(false);
        return;
      }

      // 3. All other cases (completed, noshow, assigned, or first visit) — create fresh pending
      await setDoc(doc(db, 'pending', user.uid), {
        name: patientData.name || phone,
        phone: patientData.phone || phone,
        userId: user.uid,
        status: 'pending',
        arrivedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Firestore error during login flow:', err);
    }
    navigate('/patient-dashboard');
    setLoading(false);
  };

  const inputStyle = (name) => ({
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${focused === name ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '12px',
    fontSize: '15px',
    color: 'white',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxShadow: focused === name ? '0 0 0 3px rgba(37,99,235,0.15), 0 0 20px rgba(37,99,235,0.1)' : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%', zIndex: 0
      }} />

      {/* Glow behind card */}
      <div style={{
        position: 'absolute',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 1
      }} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '28px',
          padding: '44px 40px',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Top shine */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          borderRadius: '50%'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: '56px', height: '56px',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb, #60a5fa)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: '900', color: 'white',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 32px rgba(37,99,235,0.5)',
            }}>Q</motion.div>

          <h2 style={{
            color: 'white', fontSize: '26px', fontWeight: '700',
            marginBottom: '8px', letterSpacing: '-0.5px'
          }}>Welcome back</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
            Sign in to track your queue position
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px', padding: '12px 16px',
              color: '#fca5a5', fontSize: '13px',
              textAlign: 'center', marginBottom: '20px'
            }}>{error}</motion.div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              color: 'rgba(255,255,255,0.5)', fontSize: '12px',
              fontWeight: '600', letterSpacing: '0.8px',
              textTransform: 'uppercase', marginBottom: '8px', display: 'block'
            }}>Phone Number</label>
            <input
              type="tel"
              placeholder="Enter your 10-digit number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused('')}
              required
              style={inputStyle('phone')}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              color: 'rgba(255,255,255,0.5)', fontSize: '12px',
              fontWeight: '600', letterSpacing: '0.8px',
              textTransform: 'uppercase', marginBottom: '8px', display: 'block'
            }}>Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
              required
              style={inputStyle('password')}
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '15px',
              background: loading
                ? 'rgba(37,99,235,0.4)'
                : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              boxShadow: loading ? 'none' : '0 8px 32px rgba(37,99,235,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
              letterSpacing: '0.3px',
              position: 'relative', overflow: 'hidden'
            }}>
            {loading ? (
              <span style={{ opacity: 0.7 }}>Signing in...</span>
            ) : (
              'Sign In →'
            )}
          </motion.button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
            New patient?{' '}
            <span
              onClick={() => navigate('/patient-register')}
              style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: '600' }}>
              Create account
            </span>
          </p>
          <span
            onClick={() => navigate('/')}
            style={{ color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '12px' }}>
            ← Back to home
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default PatientLogin;