import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, LanguageSwitcher } from '../LanguageContext';
import { motion } from 'framer-motion';
import ParticleCanvas from '../components/ParticleCanvas';

function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ParticleCanvas count={120} speed={0.4} />
      <LanguageSwitcher />

      <div style={{ position: 'absolute', top: '20%', left: '15%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', borderRadius: '50%', zIndex: 1, filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(99,179,237,0.1) 0%, transparent 70%)', borderRadius: '50%', zIndex: 1, filter: 'blur(40px)' }} />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '20px', maxWidth: '640px', width: '100%' }}>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '40px' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50px', padding: '8px 20px',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{
              width: '30px', height: '30px',
              background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '700', color: 'white',
            }}>Q</div>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '18px', letterSpacing: '1px' }}>QALM</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            fontSize: 'clamp(38px, 7vw, 68px)',
            fontWeight: '700',
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '20px',
            letterSpacing: '-2px',
          }}
        >
          Your queue.<br />On your phone.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            fontSize: 'clamp(16px, 2.5vw, 19px)',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: '48px',
            lineHeight: 1.65,
          }}
        >
          Patients track their turn in real time.<br />Staff manage queues without the chaos.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '56px' }}
        >
          <button
            onClick={() => navigate('/patient-login')}
            style={{
              padding: '15px 32px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
            }}>
            {t.iAmPatient}
          </button>

          <button
            onClick={() => navigate('/admin-login')}
            style={{
              padding: '15px 32px',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', backdropFilter: 'blur(10px)',
            }}>
            {t.hospitalStaff}
          </button>

          <button
            onClick={() => navigate('/doctor-login')}
            style={{
              padding: '15px 32px',
              background: 'rgba(16,185,129,0.08)',
              color: '#10b981',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: '12px', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', backdropFilter: 'blur(10px)',
            }}>
            {t.iAmDoctor}
          </button>
        </motion.div>

        {/* Value statements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          style={{
            display: 'flex', gap: '0', justifyContent: 'center',
            flexWrap: 'wrap', marginBottom: '56px',
          }}
        >
          {[
            'No more crowding reception',
            'Know your turn before you arrive',
            'Works on any phone, no download',
          ].map((text, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          style={{
            display: 'flex', gap: '14px', justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            {
              title: 'Your number on your phone',
              desc: 'Patients see exactly how many people are ahead of them. No guessing, no hovering at the front desk.',
            },
            {
              title: 'One system, every department',
              desc: 'General OPD, Cardiology, Paediatrics — each department has its own queue. Doctors call from their own list.',
            },
            {
              title: 'No app to download',
              desc: 'Patients scan a QR code at reception. Works on any phone with mobile data. Takes 30 seconds to register.',
            },
          ].map((feature, i) => (
            <div key={i} style={{
              flex: '1 1 200px', maxWidth: '240px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px', padding: '24px 20px',
              backdropFilter: 'blur(20px)', textAlign: 'left',
            }}>
              <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '600', margin: '0 0 10px 0', lineHeight: 1.4 }}>{feature.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', lineHeight: '1.65', margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default Home;
