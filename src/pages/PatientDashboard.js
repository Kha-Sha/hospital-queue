import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp} from 'firebase/firestore';
function PatientDashboard() {
  const navigate = useNavigate();
  const [, setQueueData] = useState(null);
  const [currentToken, setCurrentToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/patient-login');
      return;
    }

    // Listen to hospital settings (current token being called)
    const settingsRef = doc(db, 'settings', 'hospital');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setCurrentToken(snap.data().currentToken || 0);
      }
    });

    // Check if patient already checked in
    const q = query(
      collection(db, 'queue'),
      where('userId', '==', auth.currentUser.uid),
      where('status', '==', 'waiting')
    );
    const unsubQueue = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setTokenNumber(data.tokenNumber);
        setCheckedIn(true);
        setQueueData(data);
      }
      setLoading(false);
    });

    // Count waiting patients
    const waitingQ = query(collection(db, 'queue'), where('status', '==', 'waiting'));
    const unsubWaiting = onSnapshot(waitingQ, (snapshot) => {
      setWaitingCount(snapshot.size);
    });

    return () => { unsubSettings(); unsubQueue(); unsubWaiting(); };
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
        tokenNumber: newToken,
        status: 'waiting',
        checkInTime: serverTimestamp(),
      });

      const { updateDoc, setDoc } = await import('firebase/firestore');
      await setDoc(settingsRef, { lastToken: newToken }, { merge: true });

      setTokenNumber(newToken);
      setCheckedIn(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const tokensAhead = tokenNumber ? Math.max(0, tokenNumber - currentToken - 1) : 0;
  const estimatedWait = tokensAhead * 10;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '18px' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#1e3a5f', margin: 0 }}>🏥 My Queue</h2>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#666' }}>Logout</button>
        </div>

        {!checkedIn ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎟️</div>
            <h3 style={{ color: '#1e3a5f', marginBottom: '10px' }}>Ready to check in?</h3>
            <p style={{ color: '#666', marginBottom: '10px' }}>{waitingCount} patients currently waiting</p>
            <p style={{ color: '#666', marginBottom: '30px' }}>Estimated wait: ~{waitingCount * 10} minutes</p>
            <button onClick={handleCheckIn} style={{
              width: '100%', padding: '16px', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer'
            }}>
              Check In Now
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background: '#2563eb', borderRadius: '16px', padding: '30px', textAlign: 'center', color: 'white', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', opacity: 0.8 }}>Your Token Number</p>
              <div style={{ fontSize: '72px', fontWeight: 'bold', lineHeight: 1 }}>{tokenNumber}</div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#666', fontSize: '12px', margin: '0 0 4px 0' }}>Now Calling</p>
                  <p style={{ color: '#1e3a5f', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{currentToken}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#666', fontSize: '12px', margin: '0 0 4px 0' }}>Ahead of You</p>
                  <p style={{ color: '#1e3a5f', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{tokensAhead}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#666', fontSize: '12px', margin: '0 0 4px 0' }}>Est. Wait</p>
                  <p style={{ color: '#1e3a5f', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{estimatedWait}m</p>
                </div>
              </div>

              {currentToken === tokenNumber ? (
  <div style={{
    background: '#ff0000',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    animation: 'pulse 1s infinite'
  }}>
    <p style={{ color: 'white', fontWeight: 'bold', margin: 0, fontSize: '20px' }}>
      🚨 YOUR NUMBER IS BEING CALLED NOW!
    </p>
    <p style={{ color: 'white', margin: '8px 0 0 0', fontSize: '14px' }}>
      Please proceed to the doctor's room immediately
    </p>
  </div>
) : tokensAhead <= 2 && tokensAhead > 0 ? (
  <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
    <p style={{ color: '#d97706', fontWeight: 'bold', margin: 0 }}>⚠️ Get ready — only {tokensAhead} patient(s) ahead of you!</p>
  </div>
) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDashboard;