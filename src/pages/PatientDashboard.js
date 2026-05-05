import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, getHospitalId } from '../firebase';
import { useLanguage, LanguageSwitcher } from '../LanguageContext';
import { signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Hospital, CheckCircle, LogOut } from 'lucide-react';
import ParticleCanvas from '../components/ParticleCanvas';

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
  { text: "Within you, there is a stillness and sanctuary to which you can retreat at any time.", author: "Hermann Hesse" },
  { text: "Nothing in nature blooms all year. Be patient with yourself.", author: "Unknown" },
  { text: "Your body is not a problem to be solved. It is a home to be cared for.", author: "Unknown" },
  { text: "Sometimes the most productive thing you can do is rest.", author: "Mark Black" },
  { text: "Healing is not linear. Some days will be harder than others, and that's okay.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Be gentle with yourself. You are a child of the universe, no less than the trees and the stars.", author: "Max Ehrmann" },
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
  const [tokensAhead, setTokensAhead] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [checkInTimeLocal, setCheckInTimeLocal] = useState(null);
  const [queuePaused, setQueuePaused] = useState(false);
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappClicked, setWhatsappClicked] = useState(() => localStorage.getItem('qalm_wa_clicked_' + (auth.currentUser?.uid || '')) === 'true');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const receiptShownRef = useRef(false);
  const wasBeingCalled = useRef(false);

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
    if (!auth.currentUser) { navigate('/patient-login'); return; }
    const fetchName = async () => {
      const snap = await getDoc(doc(db, 'patients', auth.currentUser.uid));
      if (snap.exists()) {
        const fullName = snap.data().name || '';
        setPatientName(fullName.split(' ')[0]);
      }
    };
    fetchName();

    const pendingRef = doc(db, 'hospitals', getHospitalId(), 'pending', auth.currentUser.uid);
    const unsubPending = onSnapshot(pendingRef, (snap) => {
      setIsPending(snap.exists() && snap.data().status === 'pending');
      setLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), (snap) => {
      if (snap.exists()) {
        setHospitalName(snap.data().hospitalName || '');
        setQueuePaused(snap.data().queuePaused || false);
        setWhatsappNumber(snap.data().whatsappNumber || '');
        setGooglePlaceId(snap.data().googlePlaceId || '');
      }
    });

    const q = query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('userId', '==', auth.currentUser.uid), where('status', '==', 'waiting'));
    const unsubQueue = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const token = data.tokenNumber;
        setTokenNumber(token);
        setPatientDepartment(data.department || '');
        setCheckedIn(true);
        if (!receiptShownRef.current) {
          receiptShownRef.current = true;
          setCheckInTimeLocal(new Date());
          setShowReceipt(true);
        }
      } else {
        if (wasBeingCalled.current) {
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
    try {
      const snap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('userId', '==', auth.currentUser.uid), where('status', '==', 'waiting')));
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'hospitals', getHospitalId(), 'queue', d.id), { status: 'cancelled' })));
      await deleteDoc(doc(db, 'hospitals', getHospitalId(), 'pending', auth.currentUser.uid));
      localStorage.removeItem('qalm_seen_' + auth.currentUser.uid);
      setCheckedIn(false);
      setTokenNumber(null);
      setPatientDepartment('');
      setShowLeaveConfirm(false);
    } catch (_) {}
  };

  const isBeingCalled = currentToken === tokenNumber && tokenNumber !== null;
  const estimatedWait = tokensAhead * 10;
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
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }, [isBeingCalled]);

  useEffect(() => {
    if (!tokenNumber) return;
    const q = query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'waiting'));
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.docs.filter(d => d.data().tokenNumber < tokenNumber).length;
      setTokensAhead(count);
    });
    return () => unsub();
  }, [tokenNumber]);

  useEffect(() => {
    if (!patientDepartment) return;
    const deptRef = doc(db, 'hospitals', getHospitalId(), 'departments', patientDepartment);
    const unsub = onSnapshot(deptRef, (snap) => {
      if (snap.exists()) setCurrentToken(snap.data().currentToken || 0);
    });
    return () => unsub();
  }, [patientDepartment]);

  useEffect(() => {
    if (!showHistory || !auth.currentUser) return;
    const fetchHistory = async () => {
      const snap = await getDocs(query(
        collection(db, 'hospitals', getHospitalId(), 'queue'),
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
      const snap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'doctors'), where('department', '==', patientDepartment)));
      if (!snap.empty) setAssignedDoctor(snap.docs[0].data().name || '');
      else setAssignedDoctor('');
    };
    fetchDoctor();
  }, [patientDepartment]);

  // ── Loading ──
  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      color: 'rgba(255,255,255,0.5)', fontSize: '15px',
    }}>
      <LanguageSwitcher />
      {t.loading}
    </div>
  );

  // ── Pending screen ──
  if (isPending) return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <LanguageSwitcher />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '28px', padding: '52px 40px',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
          textAlign: 'center', maxWidth: '400px', width: '100%',
        }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: 'flex', justifyContent: 'center',
            marginBottom: '28px', color: '#2563eb',
          }}
        >
          <Clock size={48} strokeWidth={1.5} />
        </motion.div>

        {patientName && (
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginBottom: '8px' }}>
            {t.hello} {patientName}
          </p>
        )}
        <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '600', marginBottom: '12px' }}>
          {hospitalName ? `${t.youreRegisteredAt} ${hospitalName}.` : t.youreRegistered}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
          {t.receptionistAssigning}
        </p>

        {/* Calm progress bar */}
        <div style={{
          height: '4px', background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px', overflow: 'hidden', marginBottom: '24px',
        }}>
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              height: '100%', width: '40%',
              background: 'linear-gradient(90deg, transparent, #2563eb, transparent)',
              borderRadius: '4px',
            }}
          />
        </div>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
          {t.screenWillUpdate}
        </p>
      </motion.div>
    </div>
  );

  // ── Get Well Soon screen ──
  if (hasBeenSeen) return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 40%, #f0fdfa 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          textAlign: 'center', maxWidth: '380px', width: '100%',
          padding: '20px',
        }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}
        >
          <CheckCircle size={80} color="#10b981" strokeWidth={1.5} />
        </motion.div>

        {hospitalName && (
          <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', marginBottom: '8px', letterSpacing: '0.3px' }}>
            {hospitalName}
          </p>
        )}

        <h2 style={{ color: '#111827', fontSize: '28px', fontWeight: '700', marginBottom: '12px', letterSpacing: '-0.5px' }}>
          {t.takeCare}{patientName ? `, ${patientName}` : ''}.
        </h2>

        {assignedDoctor && (
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '8px' }}>
            {t.seenByDoctor} Dr. {assignedDoctor}.
          </p>
        )}

        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
          {t.getWellSoonSubtitle}
        </p>

        {googlePlaceId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              background: '#fef9ec',
              border: '1px solid #fde68a',
              borderRadius: '16px',
              padding: '18px 20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#92400e', fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
              Enjoying a shorter wait?
            </p>
            <p style={{ color: '#b45309', fontSize: '13px', margin: '0 0 14px 0', lineHeight: 1.5 }}>
              Help others find us — takes 30 seconds.
            </p>
            <a
              href={`https://search.google.com/local/writereview?placeid=${googlePlaceId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px',
                background: 'white', border: '1px solid #d1d5db',
                borderRadius: '10px', color: '#374151',
                fontSize: '14px', fontWeight: '600',
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              ⭐ Leave a Google Review
            </a>
          </motion.div>
        )}

        <button
          onClick={handleLogout}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 28px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px', color: '#6b7280',
            cursor: 'pointer', fontSize: '14px', fontWeight: '500',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
          <LogOut size={16} />
          {t.logout}
        </button>
      </motion.div>
    </div>
  );

  const currentQuote = QUOTES[quoteIndex];

  // ── Main dashboard ──
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      padding: '20px',
      position: 'relative', overflow: 'hidden',
    }}>
      <ParticleCanvas />
      <LanguageSwitcher />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '460px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '28px', paddingTop: '12px',
          }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px', height: '26px',
                background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                borderRadius: '7px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'white',
              }}>Q</div>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '15px', letterSpacing: '1px' }}>QALM</span>
            </div>
            {hospitalName && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>{hospitalName}</p>
            )}
            {patientName && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '2px' }}>
                {t.hello} {patientName}
              </p>
            )}
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '8px 14px',
            cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '13px',
          }}>
            <LogOut size={14} />
            {t.logout}
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {!checkedIn ? (
            // ── Not yet assigned ──
            <motion.div key="checkin" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.4 }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px', padding: '40px',
                backdropFilter: 'blur(40px)', textAlign: 'center',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: 'rgba(255,255,255,0.3)' }}>
                  <Hospital size={44} strokeWidth={1.5} />
                </div>
                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
                  {t.pleaseCheckInAtReception}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', lineHeight: '1.6' }}>
                  {t.showThisScreen}
                </p>
              </div>
            </motion.div>
          ) : (
            // ── In queue ──
            <motion.div key="queue" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              {/* Token card */}
              {isBeingCalled ? (
                // ── Being called ──
                <motion.div
                  animate={{ boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 24px rgba(239,68,68,0.06)', '0 0 0 0 rgba(239,68,68,0)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(127,29,29,0.9), rgba(185,28,28,0.7))',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: '24px', padding: '40px 36px',
                    backdropFilter: 'blur(40px)',
                    textAlign: 'center', marginBottom: '16px',
                    position: 'relative', overflow: 'hidden',
                  }}>
                  {/* Pulsing rings */}
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                    <div style={{
                      position: 'absolute', inset: '-24px',
                      borderRadius: '50%',
                      border: '2px solid rgba(239,68,68,0.4)',
                      animation: 'pulse-ring 1.4s ease-out infinite',
                    }} />
                    <div style={{
                      position: 'absolute', inset: '-24px',
                      borderRadius: '50%',
                      border: '2px solid rgba(239,68,68,0.25)',
                      animation: 'pulse-ring 1.4s ease-out 0.5s infinite',
                    }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      {t.yourTurnNow}
                    </p>
                    <div style={{
                      fontSize: '104px', fontWeight: '400', color: 'white', lineHeight: 1,
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}>
                      {tokenNumber}
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginBottom: '24px' }}>
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
                      cursor: 'pointer', fontSize: '15px', fontWeight: '600',
                    }}>
                    {t.imOnMyWay}
                  </button>
                </motion.div>
              ) : (
                // ── Waiting ──
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '24px', padding: '40px 36px',
                  backdropFilter: 'blur(40px)',
                  textAlign: 'center', marginBottom: '16px',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    {t.yourToken}
                  </p>
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 3.5, repeat: Infinity }}
                    style={{
                      fontSize: '128px', fontWeight: '400', color: 'white', lineHeight: 1,
                      marginBottom: '16px',
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {tokenNumber}
                  </motion.div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {patientDepartment && (
                      <span style={{
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '20px', padding: '4px 14px',
                        color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '500',
                      }}>{patientDepartment}</span>
                    )}
                    {assignedDoctor && (
                      <span style={{
                        color: 'rgba(255,255,255,0.45)', fontSize: '13px',
                      }}>Dr. {assignedDoctor}</span>
                    )}
                  </div>
                </div>
              )}

              {/* WhatsApp prompt */}
              {!isBeingCalled && whatsappNumber && !whatsappClicked && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(37,211,102,0.06)',
                    border: '1px solid rgba(37,211,102,0.18)',
                    borderRadius: '18px', padding: '16px 20px', marginBottom: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '12px',
                  }}
                >
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0 }}>
                    {t.getWhatsappUpdates}
                  </p>
                  <button
                    onClick={() => {
                      const message = encodeURIComponent(
                        `Hi, my token number is ${tokenNumber} at ${hospitalName}. Please notify me when my turn is near.`
                      );
                      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
                      localStorage.setItem('qalm_wa_clicked_' + auth.currentUser.uid, 'true');
                      setWhatsappClicked(true);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '9px 18px',
                      background: '#25D366', border: 'none',
                      borderRadius: '10px', color: 'white',
                      cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.enableWhatsapp}
                  </button>
                </motion.div>
              )}

              {/* Token receipt */}
              <AnimatePresence>
                {showReceipt && !isBeingCalled && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      borderRadius: '18px', padding: '18px 22px', marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>{t.receiptTitle}</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', margin: '3px 0 0 0' }}>{hospitalName}</p>
                      </div>
                      <button onClick={() => setShowReceipt(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '20px', padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '0 0 3px 0' }}>{t.receiptDepartment}</p>
                        <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>{patientDepartment}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '0 0 3px 0' }}>{t.receiptToken}</p>
                        <p style={{ color: '#60a5fa', fontSize: '26px', fontWeight: '700', margin: 0, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1 }}>{tokenNumber}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '0 0 3px 0' }}>{t.receiptCheckedIn}</p>
                        <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                          {checkInTimeLocal ? checkInTimeLocal.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '0 0 3px 0' }}>{t.estWait}</p>
                        <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>{estimatedWait} min</p>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '10px', textAlign: 'center' }}>
                      <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '11px', margin: 0 }}>{t.receiptShowAtReception}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Queue paused banner */}
              {queuePaused && !isBeingCalled && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
                    borderRadius: '14px', padding: '12px 16px', textAlign: 'center', marginBottom: '14px',
                  }}>
                  <p style={{ color: '#fbbf24', fontWeight: '500', fontSize: '13px', margin: 0 }}>
                    {t.queuePaused}
                  </p>
                </motion.div>
              )}

              {/* Stats row */}
              {!isBeingCalled && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: t.nowCalling, value: currentToken },
                    { label: t.aheadOfYou, value: tokensAhead, highlight: tokensAhead === 0 },
                    { label: t.estTime, value: estimatedTime },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${stat.highlight ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '14px', padding: '14px 10px',
                      backdropFilter: 'blur(20px)', textAlign: 'center',
                    }}>
                      <div style={{ color: stat.highlight ? '#4ade80' : 'white', fontSize: '22px', fontWeight: '700', fontFamily: "'DM Serif Display', Georgia, serif" }}>{stat.value}</div>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '4px', letterSpacing: '0.3px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Almost your turn */}
              {isNextUp && !isBeingCalled && (
                <p style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '500', textAlign: 'center', marginBottom: '14px' }}>
                  {t.almostYourTurn} — {tokensAhead} patient{tokensAhead > 1 ? 's' : ''} ahead
                </p>
              )}

              {/* Quote section */}
              {!isBeingCalled && (
                <div style={{
                  padding: '28px 24px', marginBottom: '14px', textAlign: 'center',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>
                    {t.whileYouWait}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={quoteIndex}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: quoteVisible ? 1 : 0, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p style={{
                        color: 'rgba(255,255,255,0.55)', fontSize: '15px',
                        lineHeight: '1.75', fontStyle: 'italic', marginBottom: '10px',
                        fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: '400',
                      }}>
                        "{currentQuote.text}"
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
                        — {currentQuote.author}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* Leave queue */}
              {!isBeingCalled && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <AnimatePresence mode="wait">
                    {showLeaveConfirm ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
                      >
                        <button
                          onClick={leaveQueue}
                          style={{
                            padding: '9px 20px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: '10px', color: '#f87171',
                            cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                          }}>
                          {t.leaveYes}
                        </button>
                        <button
                          onClick={() => setShowLeaveConfirm(false)}
                          style={{
                            padding: '9px 20px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px', color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', fontSize: '13px',
                          }}>
                          {t.leaveStay}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="leave-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowLeaveConfirm(true)}
                        style={{
                          background: 'none', border: 'none',
                          color: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                          fontSize: '13px', textDecoration: 'underline',
                          textUnderlineOffset: '3px', padding: '4px 0',
                        }}>
                        {t.leaveQueue}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Visit history */}
              <div>
                <button
                  onClick={() => setShowHistory(h => !h)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px', color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', fontSize: '13px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                  <span>{t.visitHistory}</span>
                  <span style={{ fontSize: '11px' }}>{showHistory ? '▲' : '▼'}</span>
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
                                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)',
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
