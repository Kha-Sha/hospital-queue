# Qalm - Hospital Queue Management SaaS

## Project Overview
React + Firebase app for hospital OPD queue management. Dark UI with particles and glass morphism.

## Tech Stack
- Frontend: React, Framer Motion, React Router
- Backend: Firebase (Firestore, Auth)
- Deployment: Vercel
- Repo: github.com/Kha-Sha/hospital-queue

## User Roles
1. PATIENT - registers, waits for token, tracks queue position
2. ADMIN (receptionist) - assigns departments to pending patients, generates tokens, manages queue
3. DOCTOR - logs in, sees their department queue, calls next patient

## Patient Flow
Register → pending screen (waiting for receptionist) → receptionist assigns dept + token → patient sees token number + department → doctor calls them → Get Well Soon screen

## Firebase Collections
- patients: {name, phone, role, createdAt}
- pending: {name, phone, userId, status:'pending'/'assigned', arrivedAt}
- queue: {userId, name, phone, department, tokenNumber, status:'waiting'/'completed'/'noshow'/'cancelled', checkInTime}
- settings/hospital: {currentToken, lastToken, lastReset, broadcast}
- doctors: {name, phone, department}
- departments/{deptName}: {currentToken}

## Departments
General OPD, Paediatrics, Cardiology, Orthopaedics, Gynaecology, Dermatology, ENT, Ophthalmology, Neurology, Psychiatry, Dental, Radiology, Pathology/Lab

## Auth Emails
- Patients: phone@hospital.com
- Admins: phone@hospital-admin.com  
- Doctors: phone@hospital-doctor.com

## Features
- Pending flow — receptionist assigns department to arrived patients
- Multi-department support with department tabs
- Doctor login and dashboard with per-department queue
- QR code for patient check-in (printable, with print QR code button)
- Quotes displayed while patient is waiting
- PWA support
- Daily queue reset (automatic on admin login)
- Sound notification when patient is called
- Estimated appointment time shown to patient
- Visit history for returning patients
- Token receipt shown on assignment
- Analytics dashboard
- Hospital name customization
- Onboarding wizard for new hospitals
- Multi-language support (English, Hindi, Kannada, Tamil)
- Cancel token — patient can leave queue
- Priority queue jump — admin can move patient to front
- Pause/resume queue (admin)
- Doctor name shown on patient screen
- Multiple admin accounts
- Patient search by name or phone
- Get Well Soon screen after consultation
- Auto no-show detection (3 minutes)
- Firestore security rules
- Mobile optimized
- Particle performance optimization for low-end devices

## Known Issues / In Progress
V1 feature complete. Multi-language added. Ready for pilot deployment.

## Deployment
- Live URL: hospital-queue-kappa.vercel.app
- GitHub: github.com/Kha-Sha/hospital-queue
- Firebase Project: hospital-queue-80a31
- Admin credentials (test): 9999999999 / admin123

## V2 Roadmap
- Digital health records vault (patient uploads reports, doctor views history)
- WhatsApp notifications
- Native mobile app (React Native)
- Multi-hospital management dashboard
- Advanced analytics with charts
- Telemedicine queue integration

## Design System
- Background: radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)
- Primary: #2563eb
- Success: #10b981
- Warning: #fbbf24
- Cards: rgba(255,255,255,0.04) with border rgba(255,255,255,0.08), backdropFilter blur(40px)
- All pages have particle canvas background
