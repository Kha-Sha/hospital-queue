import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

const BASE_URL = 'https://hospital-queue-kappa.vercel.app';

function QRCard() {
  const [params] = useSearchParams();
  const hospitalId = params.get('hospital') || '';
  const hospitalName = params.get('name') || 'Your Clinic';
  const qrUrl = `${BASE_URL}/patient-register?hospital=${hospitalId}`;

  useEffect(() => {
    document.title = 'Qalm — Patient Check-in';
    return () => { document.title = 'Qalm'; };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; }
        @media print {
          .qr-no-print { display: none !important; }
          body { background: white; margin: 0; }
          @page { size: A5; margin: 0; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          maxWidth: '380px',
          width: '100%',
          minHeight: '500px',
          borderRadius: '16px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* Card body */}
          <div style={{
            flex: 1,
            padding: '40px 32px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>

            {/* Wordmark */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px',
                background: '#0f172a',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '17px', fontWeight: '700', color: 'white',
                fontFamily: "'DM Sans', sans-serif",
                flexShrink: 0,
              }}>Q</div>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: '700',
                fontSize: '17px',
                letterSpacing: '3px',
                color: '#0f172a',
              }}>QALM</span>
            </div>

            {/* Hospital name */}
            <h1 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: '28px',
              fontWeight: '400',
              color: '#0f172a',
              marginTop: '32px',
              lineHeight: 1.25,
            }}>
              {hospitalName}
            </h1>

            {/* Divider */}
            <div style={{
              width: '60%',
              height: '1px',
              background: '#e2e8f0',
              margin: '24px auto',
            }} />

            {/* QR code */}
            <div style={{
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
              display: 'inline-block',
            }}>
              <QRCodeCanvas
                value={qrUrl}
                size={220}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            </div>

            {/* CTA */}
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '15px',
              color: '#64748b',
              letterSpacing: '0.5px',
              marginTop: '24px',
              fontWeight: '500',
            }}>
              Scan to join the queue
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              color: '#94a3b8',
              marginTop: '6px',
              letterSpacing: '0.3px',
            }}>
              No app download needed
            </p>

          </div>

          {/* Bottom strip */}
          <div style={{
            background: '#0f172a',
            padding: '14px',
            textAlign: 'center',
          }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '500',
            }}>
              Powered by QALM
            </span>
          </div>

        </div>

        {/* Print button — hidden on print */}
        <button
          className="qr-no-print"
          onClick={() => window.print()}
          style={{
            marginTop: '28px',
            padding: '13px 36px',
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.3px',
          }}
        >
          Print This Card
        </button>

        <p className="qr-no-print" style={{
          marginTop: '10px',
          fontSize: '12px',
          color: '#94a3b8',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Print on A5 paper · Laminate for reception desk
        </p>

      </div>
    </>
  );
}

export default QRCard;
