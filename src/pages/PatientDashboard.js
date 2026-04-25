import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

const QUOTES = [
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", author: "Thich Nhat Hanh" },
  { text: "Patience is not the ability to wait, but the ability to keep a good attitude while waiting.", author: "Joyce Meyer" },
  { text: "Almost everything will work again if you unplug it for a few minutes — including you.", author: "Anne Lamott" },
  { text: "You are allowed to be both a masterpiece and a work in progress simultaneously.", author: "Sophia Bush" },
  { text: "Rest is not idleness. To lie sometimes on the grass under trees on a summer's day is by no means a waste of time.", author: "John Lubbock" },
  { text: "The most important thing is to enjoy your life — to be happy. It's all that matters.", author: "Audrey Hepburn" },
  { text: "Within you, there is a stillness and sanctuary to which you can retreat at any time.", author: "Hermann Hesse" },
  { text: "Nothing in nature blooms all year. Be patient with yourself.", author: "Unknown" },
  { text: "Your body is not a problem to be solved. It is a home to be cared for.", author: "Unknown" },
  { text: "Sometimes the most productive thing you can do is rest.", author: "Mark Black" },
  { text: "Healing is not linear. Some days will be harder than others, and that's okay.", author: "Unknown" },
  { text: "You don't have to be positive all the time. It's perfectly okay to feel sad, angry, or frustrated.", author: "Lori Deschene" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Be gentle with yourself. You are a child of the universe, no less than the trees and the stars.", author: "Max Ehrmann" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
];

function PatientDashboard() {
  const navigate = useNavigate();
  // eslint-disable-next-line
  const [queueData, setQueueData] = useState(null);
  const [currentToken, setCurrentToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [patientName, setPatientName] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const canvasRef = useRef(null);

  // Rotate quotes every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex(prev => (prev + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 800);
    }, 600000);
    return () => clearInterval(interval);
  }, []);

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
        ctx.fillStyle = `rgba(99,179,237,${this.opacity})`; ctx.fill();
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

  useEffect(() => {
    if (!auth.currentUser) { navigate('/patient-login'); return; }
    const fetchName = async () => {
      const snap = await getDoc(doc(db, 'patients', auth.currentUser.uid));
      if (snap.exists()) {
        const fullName = snap.data().name || '';
        setPatientName(fullName.split(' ')[0]);
      }
    };
    fetchName();
    // Check if patient is pending department assignment
     const pendingRef = doc(db, 'pending', auth.currentUser.uid);
     const unsubPending = onSnapshot(pendingRef, (snap) => {
       if (snap.exists() && snap.data().status === 'pending') {
       setIsPending(true);
       setLoading(false);
     } else {
       setIsPending(false);
       }
    });

    const settingsRef = doc(db, 'settings', 'hospital');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setCurrentToken(snap.data().currentToken || 0);
    });

    const q = query(collection(db, 'queue'), where('userId', '==', auth.currentUser.uid), where('status', '==', 'waiting'));
    const unsubQueue = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setTokenNumber(data.tokenNumber);
        setCheckedIn(true);
        setQueueData(data);
      }
      setLoading(false);
    });

    const waitingQ = query(collection(db, 'queue'), where('status', '==', 'waiting'));
    const unsubWaiting = onSnapshot(waitingQ, (snapshot) => { setWaitingCount(snapshot.size); });

    return () => { unsubSettings(); unsubQueue(); unsubWaiting(); unsubPending(); };
  }, [navigate]);

  const handleCheckIn = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'hospital');
      const settingsSnap = await getDoc(settingsRef);
      const lastToken = settingsSnap.exists() ? settingsSnap.data().lastToken || 0 : 0;
      const newToken = lastToken + 1;
      await addDoc(collection(db, 'queue'), {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        name: patientName,
        tokenNumber: newToken,
        status: 'waiting',
        checkInTime: serverTimestamp(),
      });
      await setDoc(settingsRef, { lastToken: newToken }, { merge: true });
      setTokenNumber(newToken);
      setCheckedIn(true);
    } catch (err) { console.error(err); }
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };
  const tokensAhead = tokenNumber ? Math.max(0, tokenNumber - currentToken - 1) : 0;
  const estimatedWait = tokensAhead * 10;
  const isBeingCalled = currentToken === tokenNumber && tokenNumber !== null;
  const isNextUp = tokensAhead <= 2 && tokensAhead > 0;

  useEffect(() => {
    if (isBeingCalled) {
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }
  }, [isBeingCalled]);

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      color: 'white', fontSize: '18px'
    }}>Loading...</div>
  );
  if (isPending) return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif", padding: '20px'
    }}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '28px', padding: '48px 40px',
        backdropFilter: 'blur(40px)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        textAlign: 'center', maxWidth: '400px', width: '100%'
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ fontSize: '48px', marginBottom: '24px' }}
      >⏳</motion.div>
      <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>
        You're registered!
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', lineHeight: '1.6' }}>
        Please wait at reception while our staff assigns your department and generates your token.
      </p>
      <div style={{
        marginTop: '24px', padding: '12px 20px',
        background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
        borderRadius: '12px'
      }}>
        <p style={{ color: '#60a5fa', fontSize: '13px', margin: 0 }}>
          Your screen will update automatically
        </p>
      </div>
    </motion.div>
  </div>
);

  const currentQuote = QUOTES[quoteIndex];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '460px', margin: '0 auto' }}>

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
            </div>
            {patientName && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>
                Hello, {patientName}
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

        <AnimatePresence mode="wait">
          {!checkedIn ? (
            <motion.div key="checkin" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5 }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '28px', padding: '36px',
                backdropFilter: 'blur(40px)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                textAlign: 'center', marginBottom: '16px',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                }} />
                <div style={{
                  width: '64px', height: '64px', borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(96,165,250,0.1))',
                  border: '1px solid rgba(96,165,250,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px auto', fontSize: '28px'
                }}>🩺</div>

                <h3 style={{ color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
                  Ready to check in?
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '24px' }}>
                  You'll get a token and can track your position in real time
                </p>

                <div style={{
                  display: 'flex', justifyContent: 'center', gap: '24px', margin: '0 0 28px 0',
                  padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#60a5fa', fontSize: '32px', fontWeight: '800' }}>{waitingCount}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '2px' }}>waiting now</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#60a5fa', fontSize: '32px', fontWeight: '800' }}>~{waitingCount * 10}m</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '2px' }}>est. wait</div>
                  </div>
                </div>

                <motion.button
                  onClick={handleCheckIn}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)',
                    color: 'white', border: 'none', borderRadius: '14px',
                    fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(37,99,235,0.5)',
                  }}>
                  Check In Now →
                </motion.button>
              </div>

              {/* Quote card - shown before checkin */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '20px', padding: '24px',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  While you wait
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: quoteVisible ? 1 : 0, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.6 }}
                  >
                    <p style={{
                      color: 'rgba(255,255,255,0.75)', fontSize: '15px',
                      lineHeight: '1.7', fontStyle: 'italic', marginBottom: '12px'
                    }}>
                      "{currentQuote.text}"
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                      — {currentQuote.author}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="queue" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

              {/* Token card */}
              <motion.div
                animate={isBeingCalled ? {
                  boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 20px rgba(239,68,68,0.08)', '0 0 0 0 rgba(239,68,68,0)'],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  background: isBeingCalled
                    ? 'linear-gradient(135deg, rgba(127,29,29,0.8), rgba(185,28,28,0.6))'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isBeingCalled ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '28px', padding: '36px',
                  backdropFilter: 'blur(40px)',
                  boxShadow: isBeingCalled
                    ? '0 32px 64px rgba(220,38,38,0.25)'
                    : '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                  textAlign: 'center', marginBottom: '16px',
                  position: 'relative', overflow: 'hidden'
                }}>
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                }} />

                {isBeingCalled ? (
                  <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚨</div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Your turn now
                    </p>
                    <div style={{ fontSize: '88px', fontWeight: '900', color: 'white', lineHeight: 1, marginBottom: '12px' }}>
                      {tokenNumber}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
                      Please proceed to the doctor's room
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Your Token
                    </p>
                    <motion.div
                      animate={{ opacity: [0.85, 1, 0.85] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{ fontSize: '96px', fontWeight: '900', color: 'white', lineHeight: 1, marginBottom: '8px' }}
                    >
                      {tokenNumber}
                    </motion.div>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>Token number</p>
                  </>
                )}
              </motion.div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: 'Now Calling', value: currentToken, highlight: false },
                  { label: 'Ahead of You', value: tokensAhead, highlight: tokensAhead === 0 },
                  { label: 'Est. Wait', value: `${estimatedWait}m`, highlight: false },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${stat.highlight ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '16px', padding: '16px',
                    backdropFilter: 'blur(20px)', textAlign: 'center'
                  }}>
                    <div style={{ color: stat.highlight ? '#4ade80' : 'white', fontSize: '26px', fontWeight: '800' }}>{stat.value}</div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Next up warning */}
              {isNextUp && !isBeingCalled && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
                    borderRadius: '14px', padding: '14px', textAlign: 'center', marginBottom: '16px'
                  }}>
                  <p style={{ color: '#fbbf24', fontWeight: '600', fontSize: '14px' }}>
                    ⚡ Almost your turn — {tokensAhead} patient{tokensAhead > 1 ? 's' : ''} ahead
                  </p>
                </motion.div>
              )}

              {/* Quote while waiting */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px', padding: '22px',
                backdropFilter: 'blur(20px)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  While you wait
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: quoteVisible ? 1 : 0, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6 }}
                  >
                    <p style={{
                      color: 'rgba(255,255,255,0.65)', fontSize: '14px',
                      lineHeight: '1.7', fontStyle: 'italic', marginBottom: '10px'
                    }}>
                      "{currentQuote.text}"
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                      — {currentQuote.author}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default PatientDashboard;