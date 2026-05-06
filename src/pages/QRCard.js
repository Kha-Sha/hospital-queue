import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

const BASE_URL = 'https://hospital-queue-kappa.vercel.app';

function QRCard() {
  const [params] = useSearchParams();
  const hospitalId = params.get('hospital') || '';
  const hospitalName = params.get('name') || 'Your Clinic';
  const qrUrl = `${BASE_URL}/patient-register?hospital=${hospitalId}`;

  return (
    <>
      <style>{`
        @media print {
          .qr-no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { size: A5; margin: 0; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        padding: '40px 20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '52px 48px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
          maxWidth: '360px',
          width: '100%',
          border: '1px solid #e5e7eb',
        }}>
          {/* Qalm logo */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '900', color: 'white',
            }}>Q</div>
            <span style={{ fontWeight: '700', fontSize: '18px', letterSpacing: '1px', color: '#111827' }}>QALM</span>
          </div>

          {/* Hospital name */}
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '6px', lineHeight: 1.3 }}>
            {hospitalName}
          </h1>

          {/* QR code */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '28px 0' }}>
            <div style={{ padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', background: 'white', display: 'inline-block' }}>
              <QRCodeCanvas value={qrUrl} size={200} bgColor="white" fgColor="#111827" level="M" />
            </div>
          </div>

          {/* Call to action */}
          <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
            Scan to track your queue
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0' }}>
            Free. No app download needed.
          </p>
        </div>

        {/* Print button — hidden in print */}
        <button
          className="qr-no-print"
          onClick={() => window.print()}
          style={{
            marginTop: '28px',
            padding: '12px 32px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
          }}
        >
          Print This Card
        </button>

        <p className="qr-no-print" style={{ marginTop: '12px', fontSize: '13px', color: '#9ca3af' }}>
          Tip: Print on A5 paper and laminate for reception desk
        </p>
      </div>
    </>
  );
}

export default QRCard;
