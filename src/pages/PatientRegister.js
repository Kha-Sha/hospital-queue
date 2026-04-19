import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function PatientRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        phone + '@hospital.com',
        password
      );

      await setDoc(doc(db, 'patients', userCredential.user.uid), {
        name: name,
        phone: phone,
        createdAt: new Date(),
        role: 'patient'
      });

      navigate('/patient-dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This phone number is already registered. Please login.');
      } else {
        setError('Registration failed. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        width: '90%',
        maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ color: '#1e3a5f', textAlign: 'center', marginBottom: '8px' }}>Create Account</h2>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px', fontSize: '14px' }}>Register to track your queue</p>

        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>{error}</p>}

        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%', padding: '12px', marginBottom: '15px',
              border: '2px solid #e0e0e0', borderRadius: '8px',
              fontSize: '16px', boxSizing: 'border-box'
            }}
          />
          <input
            type="tel"
            placeholder="Phone Number (10 digits)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{
              width: '100%', padding: '12px', marginBottom: '15px',
              border: '2px solid #e0e0e0', borderRadius: '8px',
              fontSize: '16px', boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%', padding: '12px', marginBottom: '20px',
              border: '2px solid #e0e0e0', borderRadius: '8px',
              fontSize: '16px', boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#93c5fd' : '#2563eb',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Already registered?{' '}
          <span onClick={() => navigate('/patient-login')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>
            Login here
          </span>
        </p>
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px' }}>
          <span onClick={() => navigate('/')} style={{ color: '#999', cursor: 'pointer' }}>← Back</span>
        </p>
      </div>
    </div>
  );
}

export default PatientRegister;