import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '50px 40px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🏥</div>
        <h1 style={{ color: '#1e3a5f', fontSize: '24px', marginBottom: '8px' }}>
          Smart Queue System
        </h1>
        <p style={{ color: '#666', marginBottom: '40px', fontSize: '14px' }}>
          Skip the wait. Track your turn in real-time.
        </p>

        <button
          onClick={() => navigate('/patient-login')}
          style={{
            width: '100%',
            padding: '15px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '15px'
          }}>
          I am a Patient
        </button>

        <button
          onClick={() => navigate('/admin-login')}
          style={{
            width: '100%',
            padding: '15px',
            background: 'white',
            color: '#2563eb',
            border: '2px solid #2563eb',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
          Hospital Staff
        </button>
      </div>
    </div>
  );
}

export default Home;