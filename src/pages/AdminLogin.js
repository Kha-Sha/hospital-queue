import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2027 100%)',
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
        <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '36px' }}>⚕️</div>
        <h2 style={{ color: '#1e3a5f', textAlign: 'center', marginBottom: '8px' }}>Staff Login</h2>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px', fontSize: '14px' }}>
          Hospital administration access only
        </p>

        <input
          type="tel"
          placeholder="Staff Phone Number"
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
        <button style={{
          width: '100%',
          padding: '14px',
          background: '#1e3a5f',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Login
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          <span onClick={() => navigate('/')} style={{ color: '#999', cursor: 'pointer' }}>← Back</span>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;