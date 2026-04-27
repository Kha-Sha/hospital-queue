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

## Known Issues / In Progress
- Get Well Soon screen after patient is called
- Doctor dashboard needs department-based queue filtering
- Daily queue reset runs on admin login

## Design System
- Background: radial-gradient(ellipse at 20% 50%, #0f1f3d 0%, #060d1a 60%, #0a0a0f 100%)
- Primary: #2563eb
- Success: #10b981
- Warning: #fbbf24
- Cards: rgba(255,255,255,0.04) with border rgba(255,255,255,0.08), backdropFilter blur(40px)
- All pages have particle canvas background
