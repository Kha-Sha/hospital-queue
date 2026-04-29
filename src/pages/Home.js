import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, LanguageSwitcher } from '../LanguageContext';
import { motion } from 'framer-motion';

function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isLowEnd = navigator.hardwareConcurrency <= 2 || window.innerWidth < 400;
    if (isLowEnd) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.pulse = Math.random() * Math.PI * 2;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.pulse += 0.02;
        this.opacity = 0.1 + Math.abs(Math.sin(this.pulse)) * 0.4;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 179, 237, ${this.opacity})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 120; i++) {
      particles.push(new Particle());
    }

    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 179, 237, ${0.1 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      connectParticles();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%', zIndex: 0
    }} />
  );
}

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
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <ParticleCanvas />
      <LanguageSwitcher />

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '20%', left: '15%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
        borderRadius: '50%', zIndex: 1, filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '15%',
        width: '250px', height: '250px',
        background: 'radial-gradient(circle, rgba(99,179,237,0.1) 0%, transparent 70%)',
        borderRadius: '50%', zIndex: 1, filter: 'blur(40px)'
      }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '20px' }}>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: '16px' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50px', padding: '8px 20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 'bold', color: 'white'
            }}>Q</div>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '20px', letterSpacing: '1px' }}>QALM</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            fontSize: 'clamp(36px, 7vw, 72px)',
            fontWeight: '800',
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '20px',
            letterSpacing: '-2px'
          }}
        >
          <span style={{
            background: 'linear-gradient(135deg, #60a5fa, #2563eb)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>{t.tagline}</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '48px',
            maxWidth: '540px',
            margin: '0 auto 48px auto',
            lineHeight: 1.6,
            whiteSpace: 'pre-line'
          }}
        >
          {t.subheadline}
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <button
            onClick={() => navigate('/patient-login')}
            style={{
              padding: '16px 36px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
              letterSpacing: '0.5px'
            }}>
            {t.iAmPatient}
          </button>

          <button
            onClick={() => navigate('/admin-login')}
            style={{
              padding: '16px 36px',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.5px'
            }}>
            {t.hospitalStaff}
          </button>
          
          <button
            onClick={() => navigate('/doctor-login')}
            style={{
              padding: '16px 36px',
              background: 'rgba(16,185,129,0.1)',
              color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.5px'
            }}>
            {t.iAmDoctor}
          </button>
        </motion.div>
          
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          style={{
            display: 'flex', gap: '40px', justifyContent: 'center',
            marginTop: '64px', flexWrap: 'wrap'
          }}
        >
          {[
            { number: '3hrs', label: t.avgWaitSaved },
            { number: 'Live', label: t.realTimeUpdates },
            { number: '0₹', label: t.patientCost },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '28px', fontWeight: '800', color: 'white',
                background: 'linear-gradient(135deg, #60a5fa, #2563eb)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>{stat.number}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          style={{
            display: 'flex', gap: '16px', justifyContent: 'center',
            flexWrap: 'wrap', margin: '48px auto 0 auto', maxWidth: '860px'
          }}
        >
          {[
            { icon: '⚡', title: 'Real-time Queue', desc: "Patients track their turn live. No more crowding reception asking 'how long?'" },
            { icon: '🏥', title: 'Multi-Department', desc: 'Separate queues for each department. Doctors manage their own patient flow.' },
            { icon: '📱', title: 'Works on Any Phone', desc: 'Patients scan a QR code. No app download needed. Works instantly.' },
          ].map((feature, i) => (
            <div key={i} style={{
              flex: '1 1 220px', maxWidth: '260px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px', padding: '24px',
              backdropFilter: 'blur(40px)', textAlign: 'left'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{feature.icon}</div>
              <h3 style={{ color: 'white', fontSize: '15px', fontWeight: '700', margin: '0 0 8px 0' }}>{feature.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default Home;