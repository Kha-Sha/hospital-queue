import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';

function AdminDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [currentToken, setCurrentToken] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/admin-login');
      return;
    }

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

    return () => { unsubSettings(); unsubWaiting(); unsubCompleted(); };
  }, [navigate]);

  const callNextToken = async () => {
    const next = currentToken + 1;
    await setDoc(doc(db, 'settings', 'hospital'), { currentToken: next }, { merge: true });

    const justCalled = queue.find(p => p.tokenNumber === next);
    if (justCalled) {
      await updateDoc(doc(db, 'queue', justCalled.id), { status: 'completed' });
    }
  };

  const markComplete = async (id) => {
    await updateDoc(doc(db, 'queue', id), { status: 'completed' });
  };

  const markNoShow = async (id) => {
    await updateDoc(doc(db, 'queue', id), { status: 'noshow' });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#1e3a5f', margin: 0 }}>⚕️ Admin Panel</h2>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#666' }}>Logout</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#2563eb', borderRadius: '12px', padding: '20px', textAlign: 'center', color: 'white' }}>
            <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '12px' }}>NOW CALLING</p>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{currentToken}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>WAITING</p>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#1e3a5f' }}>{waitingCount}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '12px' }}>COMPLETED</p>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#16a34a' }}>{completedCount}</p>
          </div>
        </div>

        <button onClick={callNextToken} style={{
          width: '100%', padding: '18px', background: '#16a34a', color: 'white',
          border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold',
          cursor: 'pointer', marginBottom: '20px'
        }}>
          ▶ Call Next Patient (Token {currentToken + 1})
        </button>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, color: '#1e3a5f' }}>Waiting Queue</h3>
          </div>
          {queue.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No patients waiting</div>
          ) : (
            queue.map((patient, index) => (
              <div key={patient.id} style={{
                padding: '16px 20px', borderBottom: '1px solid #f5f5f5',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: index === 0 ? '#f0f9ff' : 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: index === 0 ? '#2563eb' : '#e8edf5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', color: index === 0 ? 'white' : '#1e3a5f', fontSize: '16px'
                  }}>
                    {patient.tokenNumber}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#1e3a5f' }}>{patient.email}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                      {index === 0 ? '🟢 Next up' : `${index} ahead`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => markComplete(patient.id)} style={{
                    padding: '6px 12px', background: '#dcfce7', color: '#16a34a',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
                  }}>✓ Done</button>
                  <button onClick={() => markNoShow(patient.id)} style={{
                    padding: '6px 12px', background: '#fef3c7', color: '#d97706',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
                  }}>✗ No Show</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;