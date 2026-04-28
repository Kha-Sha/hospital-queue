import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, firebaseConfig } from '../firebase';
import { signOut, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, getDocs, getDoc, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

const DEPARTMENTS = [
  'General OPD', 'Paediatrics', 'Cardiology', 'Orthopaedics',
  'Gynaecology', 'Dermatology', 'ENT', 'Ophthalmology',
  'Neurology', 'Psychiatry', 'Dental', 'Radiology', 'Pathology/Lab'
];

const QR_URL = 'https://hospital-queue-kappa.vercel.app/patient-register';

function AdminDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [currentToken, setCurrentToken] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [noshowCount, setNoshowCount] = useState(0);
  const [calling, setCalling] = useState(false);
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
  const [activeDepartments, setActiveDepartments] = useState(DEPARTMENTS); // activeDepartments
  const [lastCalledAt, setLastCalledAt] = useState(null); // autoNoShow
  const [lastCalledId, setLastCalledId] = useState(null); // autoNoShow
  const [lastCalledToken, setLastCalledToken] = useState(null); // autoNoShow
  const [autoNoShowToast, setAutoNoShowToast] = useState(''); // autoNoShow

  useEffect(() => {
    if (!auth.currentUser) { navigate('/admin-login'); return; }
    localStorage.setItem('hospitalId', auth.currentUser.uid);

    const checkAndResetQueue = async () => {
      const settingsRef = doc(db, 'settings', 'hospital');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists() || !settingsSnap.data().hospitalName) {
        navigate('/admin-setup');
        return;
      }
      const today = new Date().toDateString();
      const lastReset = settingsSnap.data().lastReset;
      if (lastReset !== today) {
        const snap = await getDocs(query(collection(db, 'queue'), where('status', '==', 'waiting')));
        await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'queue', d.id), { status: 'cancelled' })));
        await setDoc(settingsRef, { currentToken: 0, lastToken: 0, lastReset: today }, { merge: true });
        const assignedSnap = await getDocs(query(collection(db, 'pending'), where('status', '==', 'assigned')));
        await Promise.all(assignedSnap.docs.map(d => deleteDoc(doc(db, 'pending', d.id))));
      }
    };
    checkAndResetQueue();

    const unsubSettings = onSnapshot(doc(db, 'settings', 'hospital'), (snap) => {
      if (snap.exists()) {
        setCurrentToken(snap.data().currentToken || 0);
        setHospitalName(snap.data().hospitalName || 'Your Hospital');
        if (snap.data().activeDepartments?.length) {
          setActiveDepartments(snap.data().activeDepartments); // activeDepartments
        }
      }
    });

    const unsubPending = onSnapshot(query(collection(db, 'pending'), where('status', '==', 'pending')), (snap) => {
      setPendingPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubWaiting = onSnapshot(query(collection(db, 'queue'), where('status', '==', 'waiting')), (snap) => {
      const patients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      patients.sort((a, b) => a.tokenNumber - b.tokenNumber);
      setQueue(patients);
      setWaitingCount(snap.size);
    });

    const unsubCompleted = onSnapshot(query(collection(db, 'queue'), where('status', '==', 'completed')), (snap) => setCompletedCount(snap.size));
    const unsubNoshow = onSnapshot(query(collection(db, 'queue'), where('status', '==', 'noshow')), (snap) => setNoshowCount(snap.size));

    return () => { unsubSettings(); unsubPending(); unsubWaiting(); unsubCompleted(); unsubNoshow(); };
  }, [navigate]);

  // autoNoShow: check every 30s if last called patient is still waiting after 3 min
  useEffect(() => {
    if (!lastCalledAt || !lastCalledId) return;
    const interval = setInterval(async () => {
      if (Date.now() - lastCalledAt < 3 * 60 * 1000) return;
      const docSnap = await getDoc(doc(db, 'queue', lastCalledId));
      if (docSnap.exists() && docSnap.data().status === 'waiting') {
        await updateDoc(doc(db, 'queue', lastCalledId), { status: 'noshow' });
        setAutoNoShowToast(`Token ${lastCalledToken} auto-marked as no-show`);
        setTimeout(() => setAutoNoShowToast(''), 5000);
        setLastCalledAt(null);
        setLastCalledId(null);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [lastCalledAt, lastCalledId, lastCalledToken]);

  // departmentTabs: auto-switch to All when selected dept becomes empty
  useEffect(() => {
    if (selectedDept !== 'All' && !queue.some(p => p.department === selectedDept)) {
      setSelectedDept('All');
    }
  }, [queue, selectedDept]);

  const assignDepartment = async (patient, department) => {
    try {
      const settingsRef = doc(db, 'settings', 'hospital');
      const newQueueRef = doc(collection(db, 'queue'));
      await runTransaction(db, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        const lastToken = settingsDoc.exists() ? settingsDoc.data().lastToken || 0 : 0;
        const newToken = lastToken + 1;
        transaction.set(settingsRef, { lastToken: newToken }, { merge: true });
        transaction.set(newQueueRef, {
          userId: patient.userId, name: patient.name, phone: patient.phone,
          department, tokenNumber: newToken, status: 'waiting', checkInTime: serverTimestamp(),
        });
        transaction.update(doc(db, 'pending', patient.id), { status: 'assigned' });
      });
    } catch (err) { console.error(err); }
  };

  const markComplete = async (id) => await updateDoc(doc(db, 'queue', id), { status: 'completed' });
  const markNoShow = async (id) => await updateDoc(doc(db, 'queue', id), { status: 'noshow' });
  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  const saveHospitalName = async () => {
    setEditingName(false);
    if (!hospitalName.trim()) return;
    await setDoc(doc(db, 'settings', 'hospital'), { hospitalName: hospitalName.trim() }, { merge: true });
  };

  const resetQueue = async () => {
    if (!window.confirm('Reset entire queue? This will cancel all waiting patients and reset token counters to 0.')) return;
    try {
      const snap = await getDocs(query(collection(db, 'queue'), where('status', '==', 'waiting')));
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'queue', d.id), { status: 'cancelled' })));
      await setDoc(doc(db, 'settings', 'hospital'), { currentToken: 0, lastToken: 0, lastReset: new Date().toDateString() }, { merge: true });
      const assignedSnap = await getDocs(query(collection(db, 'pending'), where('status', '==', 'assigned')));
      await Promise.all(assignedSnap.docs.map(d => deleteDoc(doc(db, 'pending', d.id))));
      const deptSnap = await getDocs(collection(db, 'departments'));
      await Promise.all(deptSnap.docs.map(d => setDoc(doc(db, 'departments', d.id), { currentToken: 0 }, { merge: true })));
    } catch (err) { console.error(err); }
  };

  const addDoctor = async (e) => {
    e.preventDefault();
    setDoctorError('');
    setAddingDoctor(true);
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, doctorPhone + '@hospital-doctor.com', doctorPassword);
      await setDoc(doc(db, 'doctors', credential.user.uid), { name: doctorName, phone: doctorPhone, department: doctorDept });
      setDoctorName(''); setDoctorPhone(''); setDoctorPassword(''); setDoctorDept('General OPD');
      setShowAddDoctor(false);
    } catch (err) {
      setDoctorError(err.message);
    } finally {
      await secondaryApp.delete();
    }
    setAddingDoctor(false);
  };

  // printQR: open print window with QR code
  const printQRCode = () => {
    const win = window.open('', '_blank', 'width=600,height=700');
    win.document.write(`<!DOCTYPE html><html><head><title>QR Code</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px;text-align:center}h1{font-size:22px;font-weight:700;margin-bottom:6px}p{color:#555;font-size:15px;margin:4px 0}.sub{font-size:12px;color:#aaa;margin-top:12px}img{margin:28px 0;border:1px solid #e5e7eb;padding:12px;border-radius:8px}</style></head><body><h1>${hospitalName}</h1><p>Scan to check in</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(QR_URL)}" width="260" height="260" onload="window.print()"/><p class="sub">${QR_URL}</p></body></html>`);
    win.document.close();
  };

  const analyticsTotal = completedCount + waitingCount + noshowCount;
  const completionRate = analyticsTotal > 0 ? `${(completedCount / analyticsTotal * 100).toFixed(0)}%` : '—';
  const noshowRate = analyticsTotal > 0 ? `${(noshowCount / analyticsTotal * 100).toFixed(0)}%` : '—';
  const hoursElapsed = Math.max(0.1, (Date.now() - new Date().setHours(0, 0, 0, 0)) / 3600000);
  const avgPerHour = (completedCount / hoursElapsed).toFixed(1);
  const deptCounts = {};
  queue.forEach(p => { deptCounts[p.department] = (deptCounts[p.department] || 0) + 1; });
  const busiestDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const activeDeptTabs = ['All', ...Object.keys(deptCounts).sort()]; // departmentTabs
  const filteredQueue = selectedDept === 'All' ? queue : queue.filter(p => p.department === selectedDept);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      fontFamily: "'Segoe UI', sans-serif", padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* autoNoShow toast */}
      <AnimatePresence>
        {autoNoShowToast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
              background: 'rgba(251,191,36,0.15)', borderBottom: '1px solid rgba(251,191,36,0.3)',
              padding: '12px 24px', color: '#fbbf24', fontSize: '14px', fontWeight: '600',
              textAlign: 'center', backdropFilter: 'blur(20px)',
            }}
          >
            ⚠️ {autoNoShowToast}
          </motion.div>
        )}
      </AnimatePresence>

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
            <button onClick={() => setShowAddDoctor(!showAddDoctor)} style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>+ Add Doctor</button>
            <button onClick={resetQueue} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#f87171', fontSize: '13px', fontWeight: '600' }}>Reset Queue</button>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Logout</button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 600 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
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
                <h3 style={{ color: '#818cf8', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>📊 Today's Analytics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 600 ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Total Patients', value: analyticsTotal },
                    { label: 'Completion Rate', value: completionRate },
                    { label: 'No-show Rate', value: noshowRate },
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
                <span style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '20px', padding: '4px 12px', color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>{pendingPatients.length} waiting</span>
              </div>
              {pendingPatients.map((patient, index) => (
                <div key={patient.id} style={{ padding: '16px 24px', borderBottom: index < pendingPatients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ color: 'white', fontWeight: '600', fontSize: '15px', margin: 0 }}>{patient.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '4px 0 0 0' }}>
                      {patient.phone}{patient.preferredDept ? ` · prefers ${patient.preferredDept}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select defaultValue={patient.preferredDept || activeDepartments[0]} id={`dept-${patient.id}`}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                      {activeDepartments.map(dept => ( // activeDepartments
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

        {/* departmentTabs: tab-style, only depts with waiting patients */}
        <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {activeDeptTabs.map(dept => (
            <button key={dept} onClick={() => setSelectedDept(dept)} style={{
              padding: '7px 14px',
              background: selectedDept === dept ? 'rgba(37,99,235,0.2)' : 'transparent',
              border: `1px solid ${selectedDept === dept ? 'rgba(37,99,235,0.4)' : 'transparent'}`,
              borderRadius: '10px',
              color: selectedDept === dept ? '#60a5fa' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: '13px', fontWeight: selectedDept === dept ? '700' : '500',
              display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease',
            }}>
              {dept}
              <span style={{
                background: selectedDept === dept ? 'rgba(37,99,235,0.35)' : 'rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700',
                color: selectedDept === dept ? '#93c5fd' : 'rgba(255,255,255,0.3)',
              }}>
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
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: isCalled ? 'rgba(239,68,68,0.15)' : index === 0 ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: isCalled ? '#f87171' : index === 0 ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '16px', boxShadow: !isCalled && index === 0 ? '0 4px 16px rgba(37,99,235,0.4)' : 'none' }}>
                      {patient.tokenNumber}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '15px' }}>{patient.name || 'Patient'}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                        {patient.department} — {isCalled ? '🔴 Called' : index === 0 ? '🟢 Next up' : `Position ${index + 1}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => markComplete(patient.id)} style={{ padding: '7px 14px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✓ Done</button>
                    <button onClick={() => markNoShow(patient.id)} style={{ padding: '7px 14px', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✗ No Show</button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Add Doctor */}
        <AnimatePresence>
          {showAddDoctor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)', borderRadius: '24px', padding: '24px', marginBottom: '16px', overflow: 'hidden' }}>
              <h3 style={{ color: '#4ade80', margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700' }}>+ Add Doctor Account</h3>
              <form onSubmit={addDoctor}>
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 600 ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input placeholder="Doctor Name" value={doctorName} onChange={e => setDoctorName(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                  <input placeholder="Phone Number" value={doctorPhone} onChange={e => setDoctorPhone(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                  <input placeholder="Password" type="password" value={doctorPassword} onChange={e => setDoctorPassword(e.target.value)} required style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                  <select value={doctorDept} onChange={e => setDoctorDept(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                    {activeDepartments.map(dept => ( // activeDepartments
                      <option key={dept} value={dept} style={{ background: '#0f1f3d' }}>{dept}</option>
                    ))}
                  </select>
                </div>
                {doctorError && <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{doctorError}</p>}
                <button type="submit" disabled={addingDoctor} style={{ padding: '10px 24px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', color: '#4ade80', cursor: addingDoctor ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}>
                  {addingDoctor ? 'Creating...' : 'Create Doctor Account'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR Code + printQR button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '28px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ background: 'white', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
            <QRCode value={QR_URL} size={100} bgColor="white" fgColor="#060d1a" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Patient Check-in QR Code</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 4px 0' }}>Print this and place it at reception</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', margin: '0 0 16px 0' }}>Patients scan to register — reception assigns department</p>
            <button onClick={printQRCode} style={{ // printQR
              padding: '8px 18px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            }}>🖨️ Print QR Code</button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

export default AdminDashboard;
