import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function PatientLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, phone + '@hospital.com', password);
      navigate('/patient-dashboard');
    } catch (err) {
      setError('Invalid phone number or password');
    }
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
        <h2 style={{ color: '#1e3a5f', textAlign: 'center', marginBottom: '8px' }}>Patient Login</h2>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px', fontSize: '14px' }}>Enter your details to check your queue</p>

        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          <button type="submit" style={{
            width: '100%',
            padding: '14px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Login
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
          New patient?{' '}
          <span
            onClick={() => navigate('/patient-register')}
            style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>
            Register here
          </span>
        </p>
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', color: '#666' }}>
          <span onClick={() => navigate('/')} style={{ color: '#999', cursor: 'pointer' }}>← Back</span>
        </p>
      </div>
    </div>
  );
}

export default PatientLogin;