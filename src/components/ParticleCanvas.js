import { useEffect, useRef } from 'react';

function ParticleCanvas({ color = '#63b3ed', count = 80, speed = 0.3 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isLowEnd = navigator.hardwareConcurrency <= 2 || window.innerWidth < 400;
    if (isLowEnd) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    const particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * speed;
        this.speedY = (Math.random() - 0.5) * speed;
        this.pulse = Math.random() * Math.PI * 2;
        this.opacity = 0;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.pulse += 0.02;
        this.opacity = 0.1 + Math.abs(Math.sin(this.pulse)) * 0.3;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = color.startsWith('rgba') ? color : hexToRgba(color, this.opacity);
        ctx.fill();
      }
    }

    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    for (let i = 0; i < count; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [color, count, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

export default ParticleCanvas;
