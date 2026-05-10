import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, firebaseConfig, getHospitalId } from '../firebase';
import { signOut, createUserWithEmailAndPassword, getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, getDocs, getDoc, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { DEPARTMENTS } from '../constants';

const BASE_URL = 'https://hospital-queue-kappa.vercel.app';

const fmtPhone = (phone) => {
  const d = (phone || '').replace(/\D/g, '');
  return d.length === 10 ? '91' + d : d;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [currentToken, setCurrentToken] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [noshowCount, setNoshowCount] = useState(0);
  const [selectedDept, setSelectedDept] = useState('All');
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorDept, setDoctorDept] = useState('General OPD');
  const [addingDoctor, setAddingDoctor] = useState(false);
  const [doctorError, setDoctorError] = useState('');
  const [hospitalName, setHospitalName] = useState('Your Hospital');
  const [editingName, setEditingName] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeDepartments, setActiveDepartments] = useState(DEPARTMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [queuePaused, setQueuePaused] = useState(false);
  const [showStaffMgmt, setShowStaffMgmt] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [adminsList, setAdminsList] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  // F1 – WhatsApp reminders
  const [showReminders, setShowReminders] = useState(false);
  // F2 – No-show recovery
  const [recentNoShows, setRecentNoShows] = useState([]);
  // F3 – Patient recall
  const [showRecall, setShowRecall] = useState(false);
  const [recallPatients, setRecallPatients] = useState([]);
  const [recallLoading, setRecallLoading] = useState(false);
  // F4 – Google Place ID
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [editingPlaceId, setEditingPlaceId] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [calledAt, setCalledAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [allCompleted, setAllCompleted] = useState([]);
  const [allNoshow, setAllNoshow] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [doctors, setDoctors] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  const qrUrl = `${BASE_URL}/patient-register?hospital=${auth.currentUser?.uid || ''}`;

  useEffect(() => {
    let unsubSettings, unsubPending, unsubWaiting, unsubCompleted, unsubNoshow, unsubAdmins, unsubDoctors;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { navigate('/admin-login'); return; }
      if (!user.email?.endsWith('@hospital-admin.com')) { navigate('/admin-login'); return; }
      localStorage.setItem('qalm_hospital_id', user.uid);

      const checkAndResetQueue = async () => {
        const settingsRef = doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital');
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists() || !settingsSnap.data().hospitalName) { navigate('/admin-setup'); return; }
        const today = new Date().toDateString();
        const lastReset = settingsSnap.data().lastReset;
        if (lastReset !== today) {
          const snap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'waiting')));
          await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'hospitals', getHospitalId(), 'queue', d.id), { status: 'cancelled' })));
          await setDoc(settingsRef, { currentToken: 0, lastToken: 0, lastReset: today }, { merge: true });
          const assignedSnap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'pending'), where('status', '==', 'assigned')));
          await Promise.all(assignedSnap.docs.map(d => deleteDoc(doc(db, 'hospitals', getHospitalId(), 'pending', d.id))));
          const pendingSnap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'pending'), where('status', '==', 'pending')));
          await Promise.all(pendingSnap.docs.map(d => deleteDoc(doc(db, 'hospitals', getHospitalId(), 'pending', d.id))));
        }
      };
      checkAndResetQueue();

      unsubSettings = onSnapshot(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), (snap) => {
        if (snap.exists()) {
          setCurrentToken(snap.data().currentToken || 0);
          setHospitalName(snap.data().hospitalName || 'Your Hospital');
          setQueuePaused(snap.data().queuePaused || false);
          setWhatsappNumber(snap.data().whatsappNumber || '');
          setGooglePlaceId(snap.data().googlePlaceId || '');
          if (snap.data().activeDepartments?.length) setActiveDepartments(snap.data().activeDepartments);
        }
      });

      unsubPending = onSnapshot(query(collection(db, 'hospitals', getHospitalId(), 'pending'), where('status', '==', 'pending')), (snap) => {
        setPendingPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubWaiting = onSnapshot(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'waiting')), (snap) => {
        const patients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        patients.sort((a, b) => a.tokenNumber - b.tokenNumber);
        setQueue(patients);
        setWaitingCount(snap.size);
      });

      unsubCompleted = onSnapshot(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'completed')), (snap) => {
        setCompletedCount(snap.size);
        setAllCompleted(snap.docs.map(d => d.data()));
      });
      unsubNoshow = onSnapshot(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'noshow')), (snap) => {
        setNoshowCount(snap.size);
        setAllNoshow(snap.docs.map(d => d.data()));
      });
      unsubAdmins = onSnapshot(collection(db, 'hospitals', getHospitalId(), 'admins'), (snap) => {
        setAdminsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      unsubDoctors = onSnapshot(collection(db, 'hospitals', getHospitalId(), 'doctors'), (snap) => {
        setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      setAuthLoading(false);
    });

    return () => {
      unsubAuth();
      unsubSettings?.();
      unsubPending?.();
      unsubWaiting?.();
      unsubCompleted?.();
      unsubNoshow?.();
      unsubAdmins?.();
      unsubDoctors?.();
    };
  }, [navigate]);

  useEffect(() => {
    if (selectedDept !== 'All' && !queue.some(p => p.department === selectedDept)) setSelectedDept('All');
  }, [queue, selectedDept]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (currentToken > 0) setCalledAt(Date.now());
  }, [currentToken]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setIsMobile(window.innerWidth < 600);
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const assignDepartment = async (patient, department) => {
    try {
      const settingsRef = doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital');
      const newQueueRef = doc(collection(db, 'hospitals', getHospitalId(), 'queue'));
      await runTransaction(db, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        const lastToken = settingsDoc.exists() ? settingsDoc.data().lastToken || 0 : 0;
        const newToken = lastToken + 1;
        transaction.set(settingsRef, { lastToken: newToken }, { merge: true });
        transaction.set(newQueueRef, {
          userId: patient.userId, name: patient.name, phone: patient.phone,
          department, tokenNumber: newToken, status: 'waiting', checkInTime: serverTimestamp(),
        });
        transaction.update(doc(db, 'hospitals', getHospitalId(), 'pending', patient.id), { status: 'assigned' });
      });
    } catch (err) { console.error(err); }
  };

  const markComplete = async (id) => await updateDoc(doc(db, 'hospitals', getHospitalId(), 'queue', id), { status: 'completed' });

  const markNoShow = async (patient) => {
    await updateDoc(doc(db, 'hospitals', getHospitalId(), 'queue', patient.id), { status: 'noshow' });
    setRecentNoShows(prev => [...prev.filter(p => p.id !== patient.id), { ...patient, noShowAt: new Date() }]);
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  const saveHospitalName = async () => {
    setEditingName(false);
    if (!hospitalName.trim()) return;
    await setDoc(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), { hospitalName: hospitalName.trim() }, { merge: true });
  };

  const saveWhatsappNumber = async () => {
    setEditingWhatsapp(false);
    await setDoc(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), { whatsappNumber: whatsappNumber.trim() }, { merge: true });
  };

  const saveGooglePlaceId = async () => {
    setEditingPlaceId(false);
    await setDoc(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), { googlePlaceId: googlePlaceId.trim() }, { merge: true });
  };

  const resetQueue = async () => {
    if (!window.confirm('Reset entire queue? This will cancel all waiting patients and reset token counters to 0.')) return;
    try {
      const snap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'waiting')));
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'hospitals', getHospitalId(), 'queue', d.id), { status: 'cancelled' })));
      await setDoc(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), { currentToken: 0, lastToken: 0, lastReset: new Date().toDateString() }, { merge: true });
      const assignedSnap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'pending'), where('status', '==', 'assigned')));
      await Promise.all(assignedSnap.docs.map(d => deleteDoc(doc(db, 'hospitals', getHospitalId(), 'pending', d.id))));
      const deptSnap = await getDocs(collection(db, 'hospitals', getHospitalId(), 'departments'));
      await Promise.all(deptSnap.docs.map(d => setDoc(doc(db, 'hospitals', getHospitalId(), 'departments', d.id), { currentToken: 0 }, { merge: true })));
    } catch (err) { console.error(err); }
  };

  const addDoctor = async (e) => {
    e.preventDefault(); setDoctorError(''); setAddingDoctor(true);
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, doctorPhone + '@hospital-doctor.com', doctorPassword);
      await setDoc(doc(db, 'doctors', credential.user.uid), { hospitalId: getHospitalId() });
      await setDoc(doc(db, 'hospitals', getHospitalId(), 'doctors', credential.user.uid), { name: doctorName, phone: doctorPhone, department: doctorDept });
      setDoctorName(''); setDoctorPhone(''); setDoctorPassword(''); setDoctorDept('General OPD');
      setShowAddDoctor(false);
    } catch (err) { setDoctorError(err.message); }
    finally { await secondaryApp.delete(); }
    setAddingDoctor(false);
  };

  const togglePause = async () => {
    await setDoc(doc(db, 'hospitals', getHospitalId(), 'settings', 'hospital'), { queuePaused: !queuePaused }, { merge: true });
  };

  const prioritizePatient = async (patient) => {
    const lowestToken = queue.length > 0 ? queue[0].tokenNumber : 1;
    await updateDoc(doc(db, 'hospitals', getHospitalId(), 'queue', patient.id), { tokenNumber: lowestToken - 0.5 });
  };

  const deactivateDoctor = async (doctorId) => {
    if (!window.confirm('Deactivate this doctor account? They will lose access until reactivated.')) return;
    try {
      await Promise.all([
        updateDoc(doc(db, 'hospitals', getHospitalId(), 'doctors', doctorId), { active: false }),
        updateDoc(doc(db, 'doctors', doctorId), { active: false }),
      ]);
    } catch (err) { console.error(err); }
  };

  const exportData = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'completed')));
      const headers = 'Name,Phone,Department,Token Number,Check-in Time,Status';
      const rows = snap.docs.map(d => {
        const p = d.data();
        const checkIn = p.checkInTime?.seconds ? new Date(p.checkInTime.seconds * 1000).toLocaleString('en-IN') : '';
        return [p.name || '', p.phone || '', p.department || '', p.tokenNumber || '', checkIn, 'completed'].join(',');
      });
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qalm-patients-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  const addStaff = async (e) => {
    e.preventDefault(); setStaffError(''); setAddingStaff(true);
    const secondaryApp = initializeApp(firebaseConfig, `secondary-staff-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, staffPhone + '@hospital-admin.com', staffPassword);
      await setDoc(doc(db, 'hospitals', getHospitalId(), 'admins', credential.user.uid), {
        name: staffName, phone: staffPhone, hospitalId: getHospitalId(), createdAt: serverTimestamp(),
      });
      setStaffName(''); setStaffPhone(''); setStaffPassword('');
    } catch (err) { setStaffError(err.message); }
    finally { await secondaryApp.delete(); setAddingStaff(false); }
  };

  const loadRecallPatients = async () => {
    setRecallLoading(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const snap = await getDocs(query(collection(db, 'hospitals', getHospitalId(), 'queue'), where('status', '==', 'completed')));
      const allCompleted = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const oldVisits = allCompleted.filter(p => {
        const ts = p.checkInTime?.seconds || 0;
        return ts > 0 && new Date(ts * 1000) < thirtyDaysAgo;
      });
      const byUser = {};
      oldVisits.forEach(p => {
        const visitDate = new Date((p.checkInTime?.seconds || 0) * 1000);
        if (!byUser[p.userId] || visitDate > byUser[p.userId].visitDate) {
          byUser[p.userId] = { ...p, visitDate };
        }
      });
      setRecallPatients(Object.values(byUser).sort((a, b) => a.visitDate - b.visitDate).slice(0, 20));
    } catch (err) { console.error(err); }
    setRecallLoading(false);
  };

  const todayStr = new Date().toDateString();
  const tsToDate = (ts) => {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    return null;
  };
  const todayCompleted = allCompleted.filter(p => tsToDate(p.checkInTime)?.toDateString() === todayStr).length;
  const todayNoshow = allNoshow.filter(p => tsToDate(p.checkInTime)?.toDateString() === todayStr).length;
  const todayTotal = todayCompleted + waitingCount + todayNoshow;
  const todayCompletionRate = todayTotal > 0 ? `${(todayCompleted / todayTotal * 100).toFixed(0)}%` : '—';
  const todayNoshowRate = todayTotal > 0 ? `${(todayNoshow / todayTotal * 100).toFixed(0)}%` : '—';
  const todayDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const hoursElapsed = Math.max(0.1, (Date.now() - new Date().setHours(0, 0, 0, 0)) / 3600000);
  const avgPerHour = (todayCompleted / hoursElapsed).toFixed(1);
  const deptCounts = {};
  queue.forEach(p => { deptCounts[p.department] = (deptCounts[p.department] || 0) + 1; });
  const busiestDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const activeDeptTabs = ['All', ...Object.keys(deptCounts).sort()];
  const filteredQueue = queue
    .filter(p => selectedDept === 'All' || p.department === selectedDept)
    .filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) || (p.phone || '').toLowerCase().includes(q);
    });
  const filteredPending = pendingPatients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.phone || '').toLowerCase().includes(q);
  });

  // F1: patients at position 4+ (index >= 3) in the sorted queue
  const reminderPatients = queue.filter((_, i) => i >= 3);

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', fontFamily: "'Segoe UI', sans-serif" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      fontFamily: "'Segoe UI', sans-serif", padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'fixed', top: '10%', left: '5%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', paddingTop: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: 'white' }}>Q</div>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '16px', letterSpacing: '1px' }}>QALM</span>
              <span style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#60a5fa', fontWeight: '600', letterSpacing: '1px' }}>ADMIN</span>
            </div>
            {editingName ? (
              <div style={{ marginTop: '4px' }}>
                <input autoFocus value={hospitalName} onChange={e => setHospitalName(e.target.value)}
                  onBlur={saveHospitalName} onKeyDown={e => e.key === 'Enter' && saveHospitalName()}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 10px', color: 'white', fontSize: '13px', outline: 'none', width: '180px' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0, fontWeight: '600' }}>{hospitalName}</p>
                <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '0 2px' }} title="Edit">✏️</button>
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '2px' }}>Hospital Queue Control</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowAnalytics(a => !a)} style={{ background: showAnalytics ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', border: `1px solid ${showAnalytics ? 'rgba(129,140,248,0.4)' : 'rgba(99,102,241,0.2)'}`, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#818cf8', fontSize: '13px', fontWeight: '600' }}>📊 Analytics</button>
            <button onClick={togglePause} style={{ background: queuePaused ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.1)', border: `1px solid ${queuePaused ? 'rgba(251,191,36,0.4)' : 'rgba(251,191,36,0.2)'}`, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>{queuePaused ? '▶ Resume' : '⏸ Pause'}</button>
            <button onClick={() => setShowAddDoctor(!showAddDoctor)} style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>+ Add Doctor</button>
            <button onClick={resetQueue} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#f87171', fontSize: '13px', fontWeight: '600' }}>Reset Queue</button>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Logout</button>
          </div>
        </motion.div>

        {/* Offline banner */}
        {!isOnline && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px', padding: '10px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>Offline — changes will sync when connection returns</span>
          </div>
        )}

        {/* Pause banner */}
        <AnimatePresence>
          {queuePaused && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '16px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>⏸</span>
              <div>
                <p style={{ color: '#fbbf24', fontWeight: '700', fontSize: '14px', margin: 0 }}>Queue is paused</p>
                <p style={{ color: 'rgba(251,191,36,0.6)', fontSize: '12px', margin: '2px 0 0 0' }}>Patients will see a pause notice. Click Resume when ready.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'NOW CALLING', value: currentToken, color: '#60a5fa' },
            { label: 'WAITING', value: waitingCount, color: 'white' },
            { label: 'COMPLETED', value: completedCount, color: '#4ade80' },
            { label: 'NO SHOWS', value: noshowCount, color: '#fbbf24' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '20px 16px', backdropFilter: 'blur(20px)', textAlign: 'center' }}>
              <div style={{ color: stat.color, fontSize: '36px', fontWeight: '800', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '6px', letterSpacing: '1.5px' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Analytics */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(20px)' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ color: '#818cf8', margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700' }}>📊 Queue Analytics</h3>
                    <p style={{ color: 'rgba(129,140,248,0.45)', fontSize: '12px', margin: 0 }}>Today — {todayDate}</p>
                  </div>
                  <button onClick={exportData} style={{ padding: '7px 14px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)', borderRadius: '8px', color: '#818cf8', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Export CSV
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Today\'s Patients', value: todayTotal },
                    { label: 'Completion Rate', value: todayCompletionRate },
                    { label: 'No-show Rate', value: todayNoshowRate },
                    { label: 'Avg / Hour', value: avgPerHour },
                    { label: 'Busiest Dept', value: busiestDept },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 12px', textAlign: 'center' }}>
                      <div style={{ color: '#818cf8', fontSize: i === 4 ? '13px' : '26px', fontWeight: '800', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '6px', letterSpacing: '1px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending patients */}
        <AnimatePresence>
          {pendingPatients.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: '24px', overflow: 'hidden', backdropFilter: 'blur(20px)', marginBottom: '16px' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(251,191,36,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '15px', fontWeight: '700' }}>⏳ New Arrivals — Assign Department</h3>
                <span style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '20px', padding: '4px 12px', color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>
                  {searchQuery && filteredPending.length !== pendingPatients.length ? `${filteredPending.length} of ${pendingPatients.length}` : pendingPatients.length} waiting
                </span>
              </div>
              {filteredPending.map((patient, index) => (
                <div key={patient.id} style={{ padding: '16px 24px', borderBottom: index < filteredPending.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ color: 'white', fontWeight: '600', fontSize: '15px', margin: 0 }}>{patient.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '4px 0 0 0' }}>
                      {patient.phone}{patient.preferredDept ? ` · prefers ${patient.preferredDept}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select defaultValue={patient.preferredDept || activeDepartments[0]} id={`dept-${patient.id}`}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                      {activeDepartments.map(dept => (
                        <option key={dept} value={dept} style={{ background: '#0f1f3d' }}>{dept}</option>
                      ))}
                    </select>
                    <button onClick={() => { const sel = document.getElementById(`dept-${patient.id}`); assignDepartment(patient, sel.value); }}
                      style={{ padding: '8px 16px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      Assign & Generate Token
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div style={{ marginBottom: '16px' }}>
          <input type="text" placeholder="🔍  Search patient by name or phone..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${searchQuery ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', fontSize: '14px', color: 'white', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }} />
        </div>

        {/* Department tabs */}
        <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {activeDeptTabs.map(dept => (
            <button key={dept} onClick={() => setSelectedDept(dept)} style={{
              padding: '7px 14px', background: selectedDept === dept ? 'rgba(37,99,235,0.2)' : 'transparent',
              border: `1px solid ${selectedDept === dept ? 'rgba(37,99,235,0.4)' : 'transparent'}`,
              borderRadius: '10px', color: selectedDept === dept ? '#60a5fa' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: '13px', fontWeight: selectedDept === dept ? '700' : '500',
              display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease',
            }}>
              {dept}
              <span style={{ background: selectedDept === dept ? 'rgba(37,99,235,0.35)' : 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700', color: selectedDept === dept ? '#93c5fd' : 'rgba(255,255,255,0.3)' }}>
                {dept === 'All' ? queue.length : (deptCounts[dept] || 0)}
              </span>
            </button>
          ))}
        </div>

        {/* Queue list */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', overflow: 'hidden', backdropFilter: 'blur(20px)', marginBottom: '16px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Waiting Queue{selectedDept !== 'All' ? ` — ${selectedDept}` : ''}
            </h3>
            <span style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '20px', padding: '4px 12px', color: '#60a5fa', fontSize: '13px', fontWeight: '600' }}>{filteredQueue.length} patients</span>
          </div>
          <AnimatePresence>
            {filteredQueue.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '15px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>Queue is clear
              </div>
            ) : filteredQueue.map((patient, index) => {
              const isCalled = patient.tokenNumber === currentToken;
              return (
                <motion.div key={patient.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.05 }}
                  style={{ padding: '16px 24px', borderBottom: index < filteredQueue.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isCalled ? 'rgba(239,68,68,0.05)' : index === 0 ? 'rgba(37,99,235,0.06)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: isCalled ? 'rgba(239,68,68,0.15)' : index === 0 ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: isCalled ? '#f87171' : index === 0 ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '16px', flexShrink: 0 }}>
                      {patient.tokenNumber}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '15px' }}>{patient.name || 'Patient'}</p>
                        {isCalled && calledAt && (now - calledAt) > 3 * 60 * 1000 && (
                          <span style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', color: '#fbbf24', fontWeight: '700', whiteSpace: 'nowrap' }}>
                            3+ min
                          </span>
                        )}
                        {searchQuery && (
                          <span style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(37,99,235,0.45)', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', color: '#93c5fd', fontWeight: '700', whiteSpace: 'nowrap' }}>
                            Token {patient.tokenNumber}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                        {patient.department} — {isCalled ? '🔴 Called' : index === 0 ? '🟢 Next up' : `Position ${index + 1}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => prioritizePatient(patient)} style={{ padding: '7px 14px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>⬆ Priority</button>
                    <button onClick={() => markComplete(patient.id)} style={{ padding: '7px 14px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✓ Done</button>
                    <button onClick={() => markNoShow(patient)} style={{ padding: '7px 14px', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✗ No Show</button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* F1 — WhatsApp Reminders */}
        {reminderPatients.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <button onClick={() => setShowReminders(s => !s)}
              style={{ width: '100%', padding: '14px 20px', background: showReminders ? 'rgba(37,211,102,0.1)' : 'rgba(37,211,102,0.06)', border: `1px solid ${showReminders ? 'rgba(37,211,102,0.3)' : 'rgba(37,211,102,0.15)'}`, borderRadius: showReminders ? '16px 16px 0 0' : '16px', color: '#25D366', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📱 WhatsApp Reminders — {reminderPatients.length} patient{reminderPatients.length !== 1 ? 's' : ''} waiting long</span>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>{showReminders ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showReminders && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(37,211,102,0.04)', border: '1px solid rgba(37,211,102,0.15)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '4px 0' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', padding: '12px 20px 4px', letterSpacing: '0.5px' }}>
                      Patients 4+ positions away — tap to open WhatsApp and send a wait-time reminder.
                    </p>
                    {reminderPatients.map((patient, idx) => {
                      const positionIdx = queue.indexOf(patient);
                      const waitMin = positionIdx * 10;
                      const msg = encodeURIComponent(`Namaskar ${patient.name}, your token is ${patient.tokenNumber} at ${hospitalName}. You have approximately ${waitMin} minutes wait. Please come to reception.`);
                      return (
                        <div key={patient.id} style={{ padding: '12px 20px', borderBottom: idx < reminderPatients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <p style={{ color: 'white', fontSize: '14px', fontWeight: '600', margin: 0 }}>{patient.name}</p>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '2px 0 0 0' }}>
                              Token #{patient.tokenNumber} · {patient.department} · ~{waitMin} min wait
                            </p>
                          </div>
                          <a href={`https://wa.me/${fmtPhone(patient.phone)}?text=${msg}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#25D366', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Send Reminder
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* F2 — No-Show Recovery */}
        <AnimatePresence>
          {recentNoShows.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '20px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(251,191,36,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '14px', fontWeight: '700' }}>🔴 Recent No-Shows — Send Recovery Message</h3>
                <button onClick={() => setRecentNoShows([])} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
              {recentNoShows.map((patient, idx) => {
                const msg = encodeURIComponent(`Namaskar ${patient.name}, your token ${patient.tokenNumber} was called at ${hospitalName} but you were not present. Please visit reception to reschedule.`);
                return (
                  <div key={patient.id} style={{ padding: '12px 20px', borderBottom: idx < recentNoShows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <p style={{ color: 'white', fontSize: '14px', fontWeight: '600', margin: 0 }}>{patient.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '2px 0 0 0' }}>Token #{patient.tokenNumber} · {patient.department}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <a href={`https://wa.me/${fmtPhone(patient.phone)}?text=${msg}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#25D366', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                        Send Recovery
                      </a>
                      <button onClick={() => setRecentNoShows(prev => prev.filter(p => p.id !== patient.id))}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>×</button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Doctor */}
        <AnimatePresence>
          {showAddDoctor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)', borderRadius: '24px', padding: '24px', marginBottom: '16px', overflow: 'hidden' }}>
              <h3 style={{ color: '#4ade80', margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700' }}>+ Add Doctor Account</h3>
              <form onSubmit={addDoctor}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input placeholder="Doctor Name" value={doctorName} onChange={e => setDoctorName(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                  <input placeholder="Phone Number" value={doctorPhone} onChange={e => setDoctorPhone(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                  <input placeholder="Password" type="password" value={doctorPassword} onChange={e => setDoctorPassword(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                  <select value={doctorDept} onChange={e => setDoctorDept(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                    {activeDepartments.map(dept => (<option key={dept} value={dept} style={{ background: '#0f1f3d' }}>{dept}</option>))}
                  </select>
                </div>
                {doctorError && <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{doctorError}</p>}
                <button type="submit" disabled={addingDoctor} style={{ padding: '10px 24px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', color: '#4ade80', cursor: addingDoctor ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}>
                  {addingDoctor ? 'Creating...' : 'Create Doctor Account'}
                </button>
              </form>
              {doctors.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Doctor Accounts ({doctors.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {doctors.map(doctor => (
                      <div key={doctor.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${doctor.active === false ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <p style={{ color: doctor.active === false ? 'rgba(255,255,255,0.3)' : 'white', fontSize: '14px', fontWeight: '600', margin: 0 }}>{doctor.name}</p>
                          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '2px 0 0 0' }}>{doctor.department} · {doctor.phone}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {doctor.active === false ? (
                            <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '3px 10px', color: '#f87171', fontSize: '12px', fontWeight: '600' }}>Deactivated</span>
                          ) : (
                            <button onClick={() => deactivateDoctor(doctor.id)} style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Deactivate</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* F3 — Patient Recall */}
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => {
            const next = !showRecall;
            setShowRecall(next);
            if (next && recallPatients.length === 0 && !recallLoading) loadRecallPatients();
          }} style={{ width: '100%', padding: '14px 20px', background: showRecall ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.05)', border: `1px solid ${showRecall ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.12)'}`, borderRadius: showRecall ? '16px 16px 0 0' : '16px', color: '#fbbf24', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔄 Patient Recall — Re-engage patients not seen in 30+ days</span>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>{showRecall ? '▲' : '▼'}</span>
          </button>
          <AnimatePresence>
            {showRecall && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.12)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '8px 0' }}>
                  {recallLoading ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '28px', fontSize: '14px' }}>Loading patients...</p>
                  ) : recallPatients.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '28px', fontSize: '14px' }}>No patients to recall — everyone visited recently.</p>
                  ) : (
                    <>
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', padding: '8px 20px 4px', letterSpacing: '0.5px' }}>
                        {recallPatients.length} patient{recallPatients.length !== 1 ? 's' : ''} haven't visited in 30+ days. Tap to send a WhatsApp follow-up.
                      </p>
                      {recallPatients.map((patient, idx) => {
                        const daysAgo = Math.floor((Date.now() - patient.visitDate.getTime()) / (1000 * 60 * 60 * 24));
                        const lastDate = patient.visitDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        const msg = encodeURIComponent(`Namaskar ${patient.name}, it has been ${daysAgo} days since your last visit at ${hospitalName}. We hope you are well. Please book your follow-up if needed.`);
                        return (
                          <div key={patient.id} style={{ padding: '12px 20px', borderBottom: idx < recallPatients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <p style={{ color: 'white', fontSize: '14px', fontWeight: '600', margin: 0 }}>{patient.name}</p>
                              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '2px 0 0 0' }}>
                                Last visit: {lastDate} ({daysAgo} days ago) · {patient.department}
                              </p>
                            </div>
                            <a href={`https://wa.me/${fmtPhone(patient.phone)}?text=${msg}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#25D366', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              Send Recall
                            </a>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Staff Management */}
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setShowStaffMgmt(s => !s)} style={{ width: '100%', padding: '14px 20px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: showStaffMgmt ? '16px 16px 0 0' : '16px', color: '#818cf8', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>👥 Staff Management</span>
            <span>{showStaffMgmt ? '▲' : '▼'}</span>
          </button>
          <AnimatePresence>
            {showStaffMgmt && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '24px' }}>
                  <h3 style={{ color: '#818cf8', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Add Admin Account</h3>
                  <form onSubmit={addStaff}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <input placeholder="Staff Name" value={staffName} onChange={e => setStaffName(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                      <input placeholder="Phone Number" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                      <input placeholder="Password" type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                    </div>
                    {staffError && <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{staffError}</p>}
                    <button type="submit" disabled={addingStaff} style={{ padding: '10px 24px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#818cf8', cursor: addingStaff ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}>
                      {addingStaff ? 'Creating...' : 'Create Admin Account'}
                    </button>
                  </form>
                  {adminsList.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Existing Admin Staff ({adminsList.length})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {adminsList.map(admin => (
                          <div key={admin.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ color: 'white', fontSize: '14px', fontWeight: '600', margin: 0 }}>{admin.name}</p>
                              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '2px 0 0 0' }}>{admin.phone}</p>
                            </div>
                            <span style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', padding: '3px 10px', color: '#818cf8', fontSize: '12px', fontWeight: '600' }}>Admin</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hospital Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(20px)', marginBottom: '16px' }}>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700' }}>⚙️ Hospital Settings</h3>

          {/* WhatsApp number */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>WhatsApp Number</p>
            {editingWhatsapp ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input autoFocus value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 919876543210 (with country code, no +)"
                  onBlur={saveWhatsappNumber} onKeyDown={e => e.key === 'Enter' && saveWhatsappNumber()}
                  style={{ flex: 1, minWidth: '200px', padding: '9px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }} />
                <button onClick={saveWhatsappNumber} style={{ padding: '9px 16px', background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '8px', color: '#25D366', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Save</button>
                <button onClick={() => setEditingWhatsapp(false)} style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ color: whatsappNumber ? 'white' : 'rgba(255,255,255,0.2)', fontSize: '14px', margin: 0, fontWeight: whatsappNumber ? '600' : '400' }}>
                  {whatsappNumber || 'Not set'}
                </p>
                <button onClick={() => setEditingWhatsapp(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }} title="Edit">✏️</button>
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '6px' }}>Patients see a "Get WhatsApp updates" button after receiving their token.</p>
          </div>

          {/* F4 — Google Place ID */}
          <div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Google Place ID</p>
            {editingPlaceId ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input autoFocus value={googlePlaceId} onChange={e => setGooglePlaceId(e.target.value)}
                  placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                  onBlur={saveGooglePlaceId} onKeyDown={e => e.key === 'Enter' && saveGooglePlaceId()}
                  style={{ flex: 1, minWidth: '200px', padding: '9px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }} />
                <button onClick={saveGooglePlaceId} style={{ padding: '9px 16px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', color: '#fbbf24', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Save</button>
                <button onClick={() => setEditingPlaceId(false)} style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ color: googlePlaceId ? 'white' : 'rgba(255,255,255,0.2)', fontSize: '14px', margin: 0, fontWeight: googlePlaceId ? '600' : '400', wordBreak: 'break-all' }}>
                  {googlePlaceId || 'Not set'}
                </p>
                <button onClick={() => setEditingPlaceId(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '12px', flexShrink: 0 }} title="Edit">✏️</button>
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '6px' }}>
              Find this in your Google Maps listing. Enables "Leave a Review" prompt on the Get Well Soon screen.
            </p>
          </div>
        </motion.div>

        {/* QR Code */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '28px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ background: 'white', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
            <QRCode value={qrUrl} size={100} bgColor="white" fgColor="#060d1a" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Patient Check-in QR Code</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 4px 0' }}>Print this and place it at reception</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', margin: '0 0 16px 0' }}>Patients scan to register — reception assigns department</p>
            <button onClick={() => window.open(`/qr-card?hospital=${getHospitalId()}&name=${encodeURIComponent(hospitalName)}`, '_blank')} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>🖨️ Print QR Code</button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

export default React.memo(AdminDashboard);
