import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { useLanguage, LanguageSwitcher } from '../LanguageContext';
import { signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[523, 0], [659, 0.18], [784, 0.36]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
      osc.start(start); osc.stop(start + 0.7);
    });
  } catch (_) {}
}

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
  const { t } = useLanguage();
  const [currentToken, setCurrentToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [patientDepartment, setPatientDepartment] = useState('');
  const [patientName, setPatientName] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(() => localStorage.getItem('qalm_seen_' + (auth.currentUser?.uid || '')) === 'true');
  const [hospitalName, setHospitalName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [visitHistory, setVisitHistory] = useState([]);
  const [tokensAhead, setTokensAhead] = useState(0); // tokensAhead accurate count
  const [showReceipt, setShowReceipt] = useState(false); // tokenReceipt
  const [checkInTimeLocal, setCheckInTimeLocal] = useState(null); // tokenReceipt
  const [queuePaused, setQueuePaused] = useState(false);
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const receiptShownRef = useRef(false); // tokenReceipt
  const wasBeingCalled = useRef(false);
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
    const isLowEnd = navigator.hardwareConcurrency <= 2 || window.innerWidth < 400;
    if (isLowEnd) return;
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
       } else {
         setIsPending(false);
       }
       setLoading(false);
       
    });

    const settingsRef = doc(db, 'settings', 'hospital');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setHospitalName(snap.data().hospitalName || '');
        setQueuePaused(snap.data().queuePaused || false);
      }
    });

    const q = query(collection(db, 'queue'), where('userId', '==', auth.currentUser.uid), where('status', '==', 'waiting'));
    const unsubQueue = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const token = data.tokenNumber;
        setTokenNumber(token);
        setPatientDepartment(data.department || '');
        setCheckedIn(true);
        if (!receiptShownRef.current) { // tokenReceipt: show once on first assignment
          receiptShownRef.current = true;
          setCheckInTimeLocal(new Date());
          setShowReceipt(true);
        }
      } else {
        if (wasBeingCalled.current) {
          // Patient was just called — keep alert screen visible until they tap "I'm on my way"
          // Don't reset tokenNumber or checkedIn; isBeingCalled stays true so the red alert remains
          setPatientDepartment('');
        } else {
          setCheckedIn(false);
          setTokenNumber(null);
          setPatientDepartment('');
        }
      }
    });

    return () => { unsubSettings(); unsubQueue(); unsubPending(); };
  }, [navigate]);




  const handleLogout = async () => {
    if (auth.currentUser) localStorage.removeItem('qalm_seen_' + auth.currentUser.uid);
    await signOut(auth);
    navigate('/');
  };

  const leaveQueue = async () => {
    if (!window.confirm(t.leaveQueueConfirm)) return;
    try {
      const snap = await getDocs(query(collection(db, 'queue'), where('userId', '==', auth.currentUser.uid), where('status', '==', 'waiting')));
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'queue', d.id), { status: 'cancelled' })));
      await deleteDoc(doc(db, 'pending', auth.currentUser.uid));
      localStorage.removeItem('qalm_seen_' + auth.currentUser.uid);
      setCheckedIn(false);
      setTokenNumber(null);
      setPatientDepartment('');
    } catch (_) {}
  };

  const estimatedWait = tokensAhead * 10;
  const isBeingCalled = currentToken === tokenNumber && tokenNumber !== null;
  const estimatedTime = (() => {
    const d = new Date(Date.now() + tokensAhead * 10 * 60 * 1000);
    const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
    return `~${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
  })();
  const isNextUp = tokensAhead <= 2 && tokensAhead > 0;

  useEffect(() => {
    if (isBeingCalled) {
      wasBeingCalled.current = true;
      playNotificationSound();
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }
  }, [isBeingCalled]);

  // tokensAhead: accurate count from Firestore — counts waiting patients ahead in queue
  useEffect(() => {
    if (!tokenNumber) return;
    const q = query(collection(db, 'queue'), where('status', '==', 'waiting'));
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.docs.filter(d => d.data().tokenNumber < tokenNumber).length;
      setTokensAhead(count);
    });
    return () => unsub();
  }, [tokenNumber]);

  useEffect(() => {
    if (!patientDepartment) return;
    const deptRef = doc(db, 'departments', patientDepartment);
    const unsubDept = onSnapshot(deptRef, (snap) => {
      if (snap.exists()) setCurrentToken(snap.data().currentToken || 0);
    });
    return () => unsubDept();
  }, [patientDepartment]);

  useEffect(() => {
    if (!showHistory || !auth.currentUser) return;
    const fetchHistory = async () => {
      const snap = await getDocs(query(
        collection(db, 'queue'),
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'completed')
      ));
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.checkInTime?.seconds || 0) - (a.checkInTime?.seconds || 0))
        .slice(0, 5);
      setVisitHistory(sorted);
    };
    fetchHistory();
  }, [showHistory]);

  useEffect(() => {
    if (!patientDepartment) { setAssignedDoctor(''); return; }
    const fetchDoctor = async () => {
      const snap = await getDocs(query(collection(db, 'doctors'), where('department', '==', patientDepartment)));
      if (!snap.empty) setAssignedDoctor(snap.docs[0].data().name || '');
      else setAssignedDoctor('');
    };
    fetchDoctor();
  }, [patientDepartment]);

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      color: 'white', fontSize: '18px'
    }}><LanguageSwitcher />{t.loading}</div>
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
      <LanguageSwitcher />
      <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>
        {t.youreRegistered}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', lineHeight: '1.6' }}>
        {t.pleaseWait}
      </p>
      <div style={{
        marginTop: '24px', padding: '12px 20px',
        background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
        borderRadius: '12px'
      }}>
        <p style={{ color: '#60a5fa', fontSize: '13px', margin: 0 }}>
          {t.screenWillUpdate}
        </p>
      </div>
    </motion.div>
  </div>
);

  if (hasBeenSeen) return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif", padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '28px', padding: '52px 40px',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
          textAlign: 'center', maxWidth: '400px', width: '100%'
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{ fontSize: '72px', margin: '0 auto 28px auto', lineHeight: 1 }}
        >🌿</motion.div>
        <LanguageSwitcher />
        <h2 style={{ color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '12px' }}>
          {t.youreAllSet}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: '1.7', marginBottom: '32px' }}>
          {t.getWellSoon}{patientName ? `, ${patientName}` : ''}. {t.takeCareof}
        </p>
        <button onClick={handleLogout} style={{
          padding: '12px 32px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: '14px'
        }}>{t.logout}</button>
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
      <LanguageSwitcher />

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
            {hospitalName && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px', fontWeight: '600' }}>
                {hospitalName}
              </p>
            )}
            {patientName && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '2px' }}>
                {t.hello} {patientName}
              </p>
            )}
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '8px 16px',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '13px'
          }}>{t.logout}</button>
        </motion.div>

        <AnimatePresence mode="wait">
          {!checkedIn ? (
            <motion.div key="checkin" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5 }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '28px', padding: '40px',
                backdropFilter: 'blur(40px)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏥</div>
                <h3 style={{ color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>
                  {t.pleaseCheckInAtReception}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.6' }}>
                  {t.showThisScreen}
                </p>
              </div>
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
                      {t.yourTurnNow}
                    </p>
                    <div style={{ fontSize: '88px', fontWeight: '900', color: 'white', lineHeight: 1, marginBottom: '12px' }}>
                      {tokenNumber}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginBottom: '20px' }}>
                      {t.proceedToDoctor}
                    </p>
                    <button
                      onClick={() => {
                        localStorage.setItem('qalm_seen_' + auth.currentUser.uid, 'true');
                        setHasBeenSeen(true);
                        setCheckedIn(false);
                        wasBeingCalled.current = false;
                      }}
                      style={{
                        padding: '12px 28px',
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '12px', color: 'white',
                        cursor: 'pointer', fontSize: '15px', fontWeight: '600'
                      }}>
                      {t.imOnMyWay}
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
                      {t.yourToken}
                    </p>
                    <motion.div
                      animate={{ opacity: [0.85, 1, 0.85] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{ fontSize: '96px', fontWeight: '900', color: 'white', lineHeight: 1, marginBottom: '8px' }}
                    >
                      {tokenNumber}
                    </motion.div>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', marginBottom: patientDepartment ? '12px' : 0 }}>{t.tokenNumber}</p>
                    {patientDepartment && (
                      <span style={{
                        display: 'inline-block',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '20px', padding: '4px 14px',
                        color: 'white', fontSize: '13px', fontWeight: '500'
                      }}>{patientDepartment}</span>
                    )}
                    {assignedDoctor && (
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '8px', marginBottom: 0 }}>
                        Dr. {assignedDoctor}
                      </p>
                    )}
                  </>
                )}
              </motion.div>

              {/* tokenReceipt: shown once when token is first assigned */}
              <AnimatePresence>
                {showReceipt && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.18)',
                      borderRadius: '20px', padding: '20px 24px', marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>Your Token Receipt</p>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: '600', margin: '3px 0 0 0' }}>{hospitalName}</p>
                      </div>
                      <button onClick={() => setShowReceipt(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '20px', padding: '0 2px', lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 3px 0' }}>Department</p>
                        <p style={{ color: 'white', fontSize: '14px', fontWeight: '700', margin: 0 }}>{patientDepartment}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 3px 0' }}>Token Number</p>
                        <p style={{ color: '#60a5fa', fontSize: '30px', fontWeight: '900', margin: 0, lineHeight: 1 }}>{tokenNumber}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 3px 0' }}>Check-in Time</p>
                        <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                          {checkInTimeLocal ? checkInTimeLocal.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 3px 0' }}>{t.estWait}</p>
                        <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>{estimatedWait} min</p>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px', textAlign: 'center' }}>
                      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', margin: 0 }}>Show this to reception if needed</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pause banner */}
              {queuePaused && !isBeingCalled && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '14px', padding: '14px 16px', textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ color: '#fbbf24', fontWeight: '600', fontSize: '14px', margin: 0 }}>
                    {t.queuePaused}
                  </p>
                </motion.div>
              )}

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 400 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: t.nowCalling, value: currentToken, highlight: false },
                  { label: t.aheadOfYou, value: tokensAhead, highlight: tokensAhead === 0 },
                  { label: t.estWait, value: `${estimatedWait}m`, highlight: false },
                  { label: t.estTime, value: estimatedTime, highlight: false },
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

              {/* Leave Queue */}
              {!isBeingCalled && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <button
                    onClick={leaveQueue}
                    style={{
                      padding: '10px 24px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '10px', color: '#f87171',
                      cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    }}>
                    {t.leaveQueue}
                  </button>
                </div>
              )}

              {/* Next up warning */}
              {isNextUp && !isBeingCalled && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
                    borderRadius: '14px', padding: '14px', textAlign: 'center', marginBottom: '16px'
                  }}>
                  <p style={{ color: '#fbbf24', fontWeight: '600', fontSize: '14px' }}>
                    ⚡ {t.almostYourTurn} — {tokensAhead} patient{tokensAhead > 1 ? 's' : ''} ahead
                  </p>
                </motion.div>
              )}

              {/* Quote while waiting */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px', padding: '22px',
                backdropFilter: 'blur(20px)', marginBottom: '12px',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  {t.whileYouWait}
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

              {/* Visit History */}
              <div>
                <button
                  onClick={() => setShowHistory(h => !h)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px', color: 'rgba(255,255,255,0.35)',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>{t.visitHistory}</span>
                  <span>{showHistory ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {visitHistory.length === 0 ? (
                          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                            {t.noPastVisits}
                          </p>
                        ) : visitHistory.map(v => {
                          const date = v.checkInTime?.seconds
                            ? new Date(v.checkInTime.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—';
                          return (
                            <div key={v.id} style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '12px', padding: '12px 16px',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                              <div>
                                <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>{v.department}</p>
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '3px 0 0 0' }}>{date}</p>
                              </div>
                              <span style={{
                                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
                                borderRadius: '8px', padding: '3px 10px',
                                color: '#4ade80', fontSize: '12px', fontWeight: '700',
                              }}>#{v.tokenNumber}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
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