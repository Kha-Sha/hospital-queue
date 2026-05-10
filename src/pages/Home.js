import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, LanguageSwitcher } from '../LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleCanvas from '../components/ParticleCanvas';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const DEMO_PATIENTS = [
  { id: 'd1', tokenNumber: 1, name: 'Priya Sharma', phone: '9876543210', department: 'General OPD' },
  { id: 'd2', tokenNumber: 2, name: 'Rajesh Kumar', phone: '9876543211', department: 'Cardiology' },
  { id: 'd3', tokenNumber: 3, name: 'Anita Patel', phone: '9876543212', department: 'Paediatrics' },
  { id: 'd4', tokenNumber: 4, name: 'Mohammed Farooq', phone: '9876543213', department: 'ENT' },
  { id: 'd5', tokenNumber: 5, name: 'Kavitha Nair', phone: '9876543214', department: 'Orthopaedics' },
];

function DemoModal({ onClose }) {
  const [demoQueue, setDemoQueue] = useState(DEMO_PATIENTS);
  const [demoCompleted, setDemoCompleted] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { onClose(); return 600; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');

  const removePatient = (id, type) => {
    setDemoQueue(q => q.filter(p => p.id !== id));
    if (type === 'done') setDemoCompleted(c => c + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(6,13,26,0.96)',
        backdropFilter: 'blur(8px)',
        overflowY: 'auto',
        padding: '20px',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Demo banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '4px 12px', color: '#fbbf24', fontSize: '12px', fontWeight: '700', letterSpacing: '1px' }}>DEMO MODE</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Auto-closes in {minutes}:{seconds}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 16px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px' }}>
            × Close Demo
          </button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: 'white' }}>Q</div>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '16px', letterSpacing: '1px' }}>QALM</span>
          <span style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#60a5fa', fontWeight: '600' }}>ADMIN</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>City Clinic, Jayanagar · Demo Session</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'NOW CALLING', value: 1, color: '#60a5fa' },
            { label: 'WAITING', value: demoQueue.length, color: 'white' },
            { label: 'COMPLETED', value: demoCompleted, color: '#4ade80' },
            { label: 'NO SHOWS', value: 0, color: '#fbbf24' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ color: s.color, fontSize: '30px', fontWeight: '800', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '5px', letterSpacing: '1.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '15px', fontWeight: '700' }}>Waiting Queue</h3>
            <span style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '20px', padding: '4px 12px', color: '#60a5fa', fontSize: '13px', fontWeight: '600' }}>{demoQueue.length} patients</span>
          </div>
          <AnimatePresence>
            {demoQueue.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '15px' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>✓</div>Queue is clear
              </div>
            ) : demoQueue.map((patient, index) => (
              <motion.div key={patient.id} initial={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                style={{ padding: '14px 20px', borderBottom: index < demoQueue.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: index === 0 ? 'rgba(37,99,235,0.06)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: index === 0 ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: index === 0 ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '15px', flexShrink: 0 }}>
                    {patient.tokenNumber}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '14px' }}>{patient.name}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      {patient.department} — {index === 0 ? '🟢 Next up' : `Position ${index + 1}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => removePatient(patient.id, 'done')} style={{ padding: '6px 12px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✓ Done</button>
                  <button onClick={() => removePatient(patient.id, 'noshow')} style={{ padding: '6px 12px', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✗ No Show</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center' }}>
          This is a live demo. No real data is stored or modified.
        </p>
      </div>
    </motion.div>
  );
}

function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const pricingRef = useRef(null);

  const [showDemo, setShowDemo] = useState(false);
  const [leadForm, setLeadForm] = useState({ clinicName: '', doctorName: '', phone: '', city: '' });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState('');

  const submitLead = async (e) => {
    e.preventDefault();
    if (leadForm.phone.replace(/\D/g, '').length !== 10) {
      setLeadError('Please enter a valid 10-digit phone number');
      return;
    }
    setLeadSubmitting(true);
    setLeadError('');
    try {
      await addDoc(collection(db, 'leads'), {
        ...leadForm,
        createdAt: serverTimestamp(),
        source: 'landing_page',
      });
      setLeadSubmitted(true);
    } catch (err) {
      setLeadError('Something went wrong. Please email us at qalm.app@gmail.com');
    }
    setLeadSubmitting(false);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ParticleCanvas count={120} speed={0.4} />
      <LanguageSwitcher />

      <div style={{ position: 'absolute', top: '20%', left: '15%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', borderRadius: '50%', zIndex: 1, filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(99,179,237,0.1) 0%, transparent 70%)', borderRadius: '50%', zIndex: 1, filter: 'blur(40px)' }} />

      {/* ── Hero ── */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '80px 20px 60px', maxWidth: '640px', width: '100%' }}>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', padding: '8px 20px', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: 'white' }}>Q</div>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '18px', letterSpacing: '1px' }}>QALM</span>
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
          style={{ fontSize: 'clamp(38px, 7vw, 68px)', fontWeight: '700', color: 'white', lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-2px' }}>
          {t.headline}
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', color: 'rgba(255,255,255,0.55)', marginBottom: '48px', lineHeight: 1.65 }}>
          {t.subheadline}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
          style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '56px' }}>
          <button onClick={() => navigate('/patient-login')} style={{ padding: '15px 32px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}>
            {t.iAmPatient}
          </button>
          <button onClick={() => navigate('/admin-login')} style={{ padding: '15px 32px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            {t.hospitalStaff}
          </button>
          <button onClick={() => navigate('/doctor-login')} style={{ padding: '15px 32px', background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            {t.iAmDoctor}
          </button>
          <button onClick={() => setShowDemo(true)} style={{ padding: '15px 32px', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            See Live Demo
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.7 }}
          style={{ display: 'flex', gap: '0', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '56px' }}>
          {[t.valueNoCrowding, t.valueKnowYourTurn, t.valueNoDownload].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>{text}</span>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.9 }}
          style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { title: t.feature1Title, desc: t.feature1Desc },
            { title: t.feature2Title, desc: t.feature2Desc },
            { title: t.feature3Title, desc: t.feature3Desc },
          ].map((feature, i) => (
            <div key={i} style={{ flex: '1 1 200px', maxWidth: '240px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px 20px', backdropFilter: 'blur(20px)', textAlign: 'left' }}>
              <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '600', margin: '0 0 10px 0', lineHeight: 1.4 }}>{feature.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', lineHeight: '1.65', margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Pricing ── */}
      <div ref={pricingRef} id="pricing" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '860px', padding: '0 20px 80px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.1 }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', textAlign: 'center', marginBottom: '12px' }}>Simple Pricing</p>
          <h2 style={{ color: 'white', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: '700', textAlign: 'center', marginBottom: '8px', letterSpacing: '-1px' }}>
            Start free. Upgrade when you grow.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', textAlign: 'center', marginBottom: '40px' }}>
            30-day free trial on all plans. No credit card required.
          </p>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Basic card */}
            <div style={{ flex: '1 1 300px', maxWidth: '380px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px 28px', backdropFilter: 'blur(20px)' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Basic</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: 'white', fontSize: '42px', fontWeight: '800', lineHeight: 1 }}>₹999</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '6px' }}>/month</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '28px' }}>For clinics getting started</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {['Queue management', 'Multi-department support', 'Patient tracking', 'Admin dashboard', 'Analytics', 'Free setup'].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '700' }}>✓</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px' }}>{item}</span>
                  </div>
                ))}
              </div>
              <a href="#contact" onClick={e => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ display: 'block', textAlign: 'center', padding: '13px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }}>
                Start Free 30-Day Trial
              </a>
            </div>

            {/* Pro card */}
            <div style={{ flex: '1 1 300px', maxWidth: '380px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.35)', borderRadius: '24px', padding: '32px 28px', backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '18px', right: '18px', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', color: 'white', letterSpacing: '0.5px' }}>
                Most Popular
              </div>
              <p style={{ color: '#60a5fa', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Pro</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: 'white', fontSize: '42px', fontWeight: '800', lineHeight: 1 }}>₹1,999</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '6px' }}>/month</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '28px' }}>For clinics serious about growth</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {[
                  'Everything in Basic',
                  'WhatsApp patient reminders',
                  'No-show recovery messages',
                  'Patient recall system',
                  'Google review prompts',
                  'Priority support',
                ].map((item, i) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: i === 0 ? 'rgba(74,222,128,0.15)' : 'rgba(37,99,235,0.2)', border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.3)' : 'rgba(96,165,250,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: i === 0 ? '#4ade80' : '#60a5fa', fontSize: '11px', fontWeight: '700' }}>✓</span>
                    </div>
                    <span style={{ color: i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)', fontSize: '14px', fontStyle: i === 0 ? 'italic' : 'normal' }}>{item}</span>
                  </div>
                ))}
              </div>
              <a href="#contact" onClick={e => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ display: 'block', textAlign: 'center', padding: '13px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: '600', textDecoration: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
                Start Free 30-Day Trial
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Contact / Lead form ── */}
      <div id="contact" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '540px', padding: '0 20px 100px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.3 }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', textAlign: 'center', marginBottom: '12px' }}>Get Started</p>
          <h2 style={{ color: 'white', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: '700', textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Ready to transform your clinic?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', textAlign: 'center', marginBottom: '32px' }}>
            We'll set it up for free and walk you through it.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', backdropFilter: 'blur(20px)' }}>
            {leadSubmitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>We'll be in touch!</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: 1.6 }}>
                  We'll call you within 24 hours to set up your free trial.<br />
                  Questions? WhatsApp us at <a href="https://wa.me/919999999999" style={{ color: '#25D366' }}>+91 99999 99999</a>.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={submitLead}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Clinic Name</label>
                    <input required placeholder="e.g. City Clinic, Jayanagar" value={leadForm.clinicName}
                      onChange={e => setLeadForm(f => ({ ...f, clinicName: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Doctor / Owner Name</label>
                    <input required placeholder="Dr. Suresh Sharma" value={leadForm.doctorName}
                      onChange={e => setLeadForm(f => ({ ...f, doctorName: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>WhatsApp Number</label>
                    <input required type="tel" placeholder="9876543210" value={leadForm.phone}
                      onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>City</label>
                    <input required placeholder="Bangalore" value={leadForm.city}
                      onChange={e => setLeadForm(f => ({ ...f, city: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  {leadError && <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0 }}>{leadError}</p>}
                  <button type="submit" disabled={leadSubmitting}
                    style={{ padding: '14px', background: leadSubmitting ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: leadSubmitting ? 'not-allowed' : 'pointer', boxShadow: leadSubmitting ? 'none' : '0 8px 24px rgba(37,99,235,0.35)', marginTop: '4px' }}>
                    {leadSubmitting ? 'Submitting...' : 'Book Free Demo Call'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Demo Modal ── */}
      <AnimatePresence>
        {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default Home;
