import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, getDocs, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

const DEPARTMENTS = [
  'General OPD', 'Paediatrics', 'Cardiology', 'Orthopaedics',
  'Gynaecology', 'Dermatology', 'ENT', 'Ophthalmology',
  'Neurology', 'Psychiatry', 'Dental', 'Radiology', 'Pathology/Lab'
];

function AdminDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [currentToken, setCurrentToken] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [noshowCount, setNoshowCount] = useState(0);
  const [calling, setCalling] = useState(false);
  const [selectedDept, setSelectedDept] = useState('General OPD');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) { navigate('/admin-login'); return; }

    // Check and reset queue daily
    const checkAndResetQueue = async () => {
      const resetSettingsRef = doc(db, 'settings', 'hospital');
      const settingsSnap = await getDoc(resetSettingsRef);
      const today = new Date().toDateString();
      if (settingsSnap.exists()) {
        const lastReset = settingsSnap.data().lastReset;
        if (lastReset !== today) {
          const waitingQ = query(collection(db, 'queue'), where('status', '==', 'waiting'));
          const snapshot = await getDocs(waitingQ);
          const batch = snapshot.docs.map(d => updateDoc(doc(db, 'queue', d.id), { status: 'cancelled' }));
          await Promise.all(batch);
          await setDoc(resetSettingsRef, { currentToken: 0, lastToken: 0, lastReset: today }, { merge: true });
        }
      } else {
        await setDoc(resetSettingsRef, { currentToken: 0, lastToken: 0, lastReset: today });
      }
    };
    checkAndResetQueue();

    const settingsRef = doc(db, 'settings', 'hospital');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setCurrentToken(snap.data().currentToken || 0);
    });

    // Listen to pending patients
    const pendingQ = query(collection(db, 'pending'), where('status', '==', 'pending'));
    const unsubPending = onSnapshot(pendingQ, (snapshot) => {
      const patients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingPatients(patients);
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

    return () => { unsubSettings(); unsubPending(); unsubWaiting(); unsubCompleted(); unsubNoshow(); };
  }, [navigate]);

  const assignDepartment = async (patient, department) => {
    try {
      const settingsRef = doc(db, 'settings', 'hospital');
      const settingsSnap = await getDoc(settingsRef);
      const lastToken = settingsSnap.exists() ? settingsSnap.data().lastToken || 0 : 0;
      const newToken = lastToken + 1;

      await addDoc(collection(db, 'queue'), {
        userId: patient.userId,
        name: patient.name,
        phone: patient.phone,
        department: department,
        tokenNumber: newToken,
        status: 'waiting',
        checkInTime: serverTimestamp(),
      });

      await setDoc(settingsRef, { lastToken: newToken }, { merge: true });
      await updateDoc(doc(db, 'pending', patient.id), { status: 'assigned' });
    } catch (err) { console.error(err); }
  };

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

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    await setDoc(doc(db, 'settings', 'hospital'), { broadcast: broadcastMsg, broadcastTime: serverTimestamp() }, { merge: true });
    setBroadcastMsg('');
    setShowBroadcast(false);
  };

  const filteredQueue = selectedDept === 'All' ? queue : queue.filter(p => p.department === selectedDept);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowBroadcast(!showBroadcast)} style={{
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '8px', padding: '8px 16px',
              cursor: 'pointer', color: '#fbbf24', fontSize: '13px', fontWeight: '600'
            }}>📢 Broadcast</button>
            <button onClick={handleLogout} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '8px 16px',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '13px'
            }}>Logout</button>
          </div>
        </motion.div>

        {/* Broadcast panel */}
        <AnimatePresence>
          {showBroadcast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.15)',
                borderRadius: '16px', padding: '20px', marginBottom: '16px'
              }}
            >
              <p style={{ color: '#fbbf24', fontSize: '13px', marginBottom: '12px', fontWeight: '600' }}>
                📢 Send message to all waiting patients
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Doctor will be 20 minutes late..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none'
                  }}
                />
                <button onClick={sendBroadcast} style={{
                  padding: '10px 20px',
                  background: 'rgba(251,191,36,0.2)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '8px', color: '#fbbf24',
                  cursor: 'pointer', fontWeight: '600', fontSize: '14px'
                }}>Send</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}
        >
          {[
            { label: 'NOW CALLING', value: currentToken, color: '#60a5fa' },
            { label: 'WAITING', value: waitingCount, color: 'white' },
            { label: 'COMPLETED', value: completedCount, color: '#4ade80' },
            { label: 'NO SHOWS', value: noshowCount, color: '#fbbf24' },
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

        {/* Pending patients */}
        <AnimatePresence>
          {pendingPatients.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(251,191,36,0.04)',
                border: '1px solid rgba(251,191,36,0.12)',
                borderRadius: '24px', overflow: 'hidden',
                backdropFilter: 'blur(20px)', marginBottom: '16px'
              }}
            >
              <div style={{
                padding: '16px 24px', borderBottom: '1px solid rgba(251,191,36,0.08)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '15px', fontWeight: '700' }}>
                  ⏳ New Arrivals — Assign Department
                </h3>
                <span style={{
                  background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: '20px', padding: '4px 12px',
                  color: '#fbbf24', fontSize: '13px', fontWeight: '600'
                }}>{pendingPatients.length} waiting</span>
              </div>

              {pendingPatients.map((patient, index) => (
                <div key={patient.id} style={{
                  padding: '16px 24px',
                  borderBottom: index < pendingPatients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: '12px'
                }}>
                  <div>
                    <p style={{ color: 'white', fontWeight: '600', fontSize: '15px', margin: 0 }}>{patient.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '4px 0 0 0' }}>{patient.phone}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      defaultValue="General OPD"
                      id={`dept-${patient.id}`}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: 'white',
                        fontSize: '13px', outline: 'none', cursor: 'pointer'
                      }}
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept} style={{ background: '#0f1f3d' }}>{dept}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById(`dept-${patient.id}`);
                        assignDepartment(patient, select.value);
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(74,222,128,0.1)',
                        color: '#4ade80',
                        border: '1px solid rgba(74,222,128,0.2)',
                        borderRadius: '8px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: '600'
                      }}>
                      Assign & Generate Token
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Department filter */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['All', ...DEPARTMENTS].map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              style={{
                padding: '6px 14px',
                background: selectedDept === dept ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedDept === dept ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '20px', color: selectedDept === dept ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600'
              }}
            >{dept}</button>
          ))}
        </div>

        {/* Call next button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: '16px' }}>
          <motion.button
            onClick={callNextToken}
            disabled={calling || queue.length === 0}
            whileHover={{ scale: calling || queue.length === 0 ? 1 : 1.02 }}
            whileTap={{ scale: calling || queue.length === 0 ? 1 : 0.98 }}
            style={{
              width: '100%', padding: '20px',
              background: calling || queue.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #15803d, #16a34a, #22c55e)',
              color: calling || queue.length === 0 ? 'rgba(255,255,255,0.3)' : 'white',
              border: `1px solid ${queue.length === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(34,197,94,0.3)'}`,
              borderRadius: '18px', fontSize: '17px', fontWeight: '700',
              cursor: calling || queue.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: calling || queue.length === 0 ? 'none' : '0 8px 32px rgba(22,163,74,0.4)',
              backdropFilter: 'blur(20px)', transition: 'all 0.3s ease'
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
            backdropFilter: 'blur(20px)', marginBottom: '16px'
          }}
        >
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Waiting Queue {selectedDept !== 'All' ? `— ${selectedDept}` : ''}
            </h3>
            <span style={{
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
              borderRadius: '20px', padding: '4px 12px',
              color: '#60a5fa', fontSize: '13px', fontWeight: '600'
            }}>{filteredQueue.length} patients</span>
          </div>

          <AnimatePresence>
            {filteredQueue.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '15px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
                Queue is clear
              </div>
            ) : (
              filteredQueue.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    padding: '16px 24px',
                    borderBottom: index < filteredQueue.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: index === 0 ? 'rgba(37,99,235,0.06)' : 'transparent',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '14px',
                      background: index === 0 ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '800', color: index === 0 ? 'white' : 'rgba(255,255,255,0.5)',
                      fontSize: '16px',
                      boxShadow: index === 0 ? '0 4px 16px rgba(37,99,235,0.4)' : 'none'
                    }}>
                      {patient.tokenNumber}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '15px' }}>
                        {patient.name || 'Patient'}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                        {patient.department} — {index === 0 ? '🟢 Next up' : `Position ${index + 1}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => markComplete(patient.id)} style={{
                      padding: '7px 14px', background: 'rgba(74,222,128,0.1)', color: '#4ade80',
                      border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                    }}>✓ Done</button>
                    <button onClick={() => markNoShow(patient.id)} style={{
                      padding: '7px 14px', background: 'rgba(251,191,36,0.08)', color: '#fbbf24',
                      border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                    }}>✗ No Show</button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '24px', padding: '28px',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap'
          }}
        >
          <div style={{ background: 'white', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
            <QRCode
              value="https://hospital-queue-kappa.vercel.app/patient-register"
              size={100} bgColor="white" fgColor="#060d1a"
            />
          </div>
          <div>
            <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>
              Patient Check-in QR Code
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 4px 0' }}>
              Print this and place it at reception
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', margin: 0 }}>
              Patients scan to register — reception assigns department
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

export default AdminDashboard;